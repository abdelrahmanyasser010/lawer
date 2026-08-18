<?php
namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Services\AuditService;
use App\Services\ConsultationScheduleService;
use App\Services\NotificationService;
use App\Services\ServiceRequestWorkflow;
use App\Services\TemplateEngineService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

final class PaymentController extends Controller
{
    use ApiResponse;

    public function __construct(
        private NotificationService $notifications,
        private AuditService $audit,
        private TemplateEngineService $engine,
        private ConsultationScheduleService $schedule,
        private ServiceRequestWorkflow $workflow,
    ) {}

    public function createReceipt(Request $request)
    {
        $auth=$request->attributes->get('auth_user');
        if(!($auth['emailVerified']??false))throw new ApiException(403,'يجب تأكيد البريد الإلكتروني أولًا','EMAIL_NOT_VERIFIED');
        $data=$request->validate([
            'contractId'=>['nullable','integer','min:1'],'serviceRequestId'=>['nullable','integer','min:1'],
            'amountEgp'=>['required','numeric','min:0'],'attachmentId'=>['required','integer','min:1'],'senderPhone'=>['nullable','string','max:30'],
        ]);
        $contractId=$data['contractId']??null;$serviceRequestId=$data['serviceRequestId']??null;
        if(!$contractId&&!$serviceRequestId)throw new ApiException(400,'حدد العقد أو طلب الخدمة المرتبط بالدفع');
        if($contractId&&$serviceRequestId)throw new ApiException(400,'اربط الإيصال بعقد واحد أو طلب خدمة واحد فقط');
        $serial='PAY-'.now()->year.'-'.strtoupper(substr(bin2hex(random_bytes(5)),0,8));$amount=(float)$data['amountEgp'];$uid=(int)$auth['id'];
        if($serviceRequestId){$pre=DB::table('service_requests')->select('request_type','status','metadata_json')->where('id',$serviceRequestId)->where('client_user_id',$uid)->first();if($pre&&$pre->status==='awaiting_payment'&&$this->workflow->supportsBooking((string)$pre->request_type)){ $preMeta=$this->json($pre->metadata_json);if(($preMeta['paymentStage']??'')!=='balance')$this->schedule->assertPaymentHoldActive((int)$serviceRequestId);}}

        $result=DB::transaction(function()use($request,$uid,$contractId,$serviceRequestId,$amount,$data,$serial){
            $serviceType=null;
            if($contractId){
                $c=DB::selectOne('SELECT c.*,tv.definition_json AS template_definition FROM contracts c JOIN template_versions tv ON tv.id=c.template_version_id WHERE c.id=? AND c.deleted_at IS NULL AND (c.user_id=? OR c.client_user_id=?) FOR UPDATE',[$contractId,$uid,$uid]);
                if(!$c)throw new ApiException(403,'العقد غير تابع لحسابك');
                if(!in_array($c->status,['draft','pending_payment'],true))throw new ApiException(409,'لا يمكن رفع دفع جديد للعقد في حالته الحالية','PAYMENT_NOT_ALLOWED');
                if($c->status==='draft'){
                    $validation=$this->engine->validateDraft($this->json($c->template_definition),(string)$c->variant_key,$this->jsonList($c->selected_optional_clause_keys),$this->json($c->field_values_json),$this->json($c->attachment_refs_json));
                    if($validation['issues'])throw new ApiException(422,'أكمل بيانات العقد المطلوبة قبل إرسال الدفع','DRAFT_INCOMPLETE',$validation['issues']);
                }
                $expected=(float)$c->original_price_egp;
                if(abs($amount-$expected)>0.009)throw new ApiException(400,"المبلغ المطلوب لهذا العقد هو {$expected} ج.م",'PAYMENT_AMOUNT_MISMATCH');
            }
            if($serviceRequestId){
                $sr=DB::selectOne('SELECT id,request_type,status,metadata_json FROM service_requests WHERE id=? AND client_user_id=? FOR UPDATE',[$serviceRequestId,$uid]);
                if(!$sr)throw new ApiException(403,'طلب الخدمة غير تابع لحسابك');
                if($sr->status!=='awaiting_payment')throw new ApiException(409,'لا يمكن رفع دفع جديد لهذا الطلب في حالته الحالية','PAYMENT_NOT_ALLOWED');
                $serviceType=(string)$sr->request_type;
                $meta=$this->json($sr->metadata_json);
                $expected=isset($meta['expectedPaymentEgp'])?(float)$meta['expectedPaymentEgp']:0.0;
                if($expected<=0){$key=$serviceType==='contract_review'?'services.contract_review.deposit_egp':($serviceType==='consultation'?'services.consultation.fee_egp':'services.contract_drafting.deposit_egp');$setting=DB::selectOne("SELECT (setting_value_json #>> '{}')::numeric::text AS amount FROM platform_settings WHERE setting_key=?",[$key]);$expected=$setting?(float)$setting->amount:0.0;}
                if($expected<=0)throw new ApiException(409,'هذا الطلب لا يحتاج دفعًا أو لا يوجد مبلغ مثبت له','SERVICE_PAYMENT_NOT_REQUIRED');
                if(abs($amount-$expected)>0.009)throw new ApiException(400,"المبلغ المطلوب لهذه الخدمة هو {$expected} ج.م",'PAYMENT_AMOUNT_MISMATCH');
            }
            $duplicate=DB::selectOne("SELECT id,status FROM payments WHERE user_id=? AND contract_id IS NOT DISTINCT FROM ? AND service_request_id IS NOT DISTINCT FROM ? AND status='pending_verification' ORDER BY created_at DESC LIMIT 1 FOR UPDATE",[$uid,$contractId,$serviceRequestId]);
            if($duplicate)throw new ApiException(409,'يوجد إثبات دفع قائم بالفعل لهذا الطلب','DUPLICATE_PAYMENT');
            $clarification=DB::selectOne("SELECT id FROM payments WHERE user_id=? AND contract_id IS NOT DISTINCT FROM ? AND service_request_id IS NOT DISTINCT FROM ? AND status='needs_client_info' ORDER BY created_at DESC LIMIT 1 FOR UPDATE",[$uid,$contractId,$serviceRequestId]);
            if($clarification)DB::table('payments')->where('id',$clarification->id)->update(['status'=>'replaced','admin_notes'=>DB::raw("COALESCE(admin_notes,'') || CASE WHEN COALESCE(admin_notes,'')='' THEN '' ELSE E'\n' END || 'استبدل العميل إثبات الدفع بإثبات جديد.'")]);
            $attachment=DB::selectOne("SELECT id FROM document_attachments WHERE id=? AND owner_user_id=? AND attachable_type='pending' FOR UPDATE",[$data['attachmentId'],$uid]);
            if(!$attachment)throw new ApiException(400,'إيصال الدفع غير موجود أو مرتبط بطلب آخر');

            $row=DB::selectOne("INSERT INTO payments (serial_number,user_id,contract_id,service_request_id,amount_egp,sender_phone,receipt_attachment_id,status,payment_method) VALUES (?,?,?,?,?,?,?,'pending_verification','vodafone_cash') RETURNING id",[$serial,$uid,$contractId,$serviceRequestId,$amount,$data['senderPhone']??null,$data['attachmentId']]);$id=(int)$row->id;
            DB::table('document_attachments')->where('id',$data['attachmentId'])->update(['attachable_type'=>'payment','attachable_id'=>$id]);
            if($contractId){
                DB::table('contracts')->where('id',$contractId)->update(['status'=>'pending_payment','submitted_at'=>now(),'updated_at'=>now()]);
                DB::statement("UPDATE contract_versions SET status='internal_review' WHERE id=(SELECT current_version_id FROM contracts WHERE id=?) AND status='draft'",[$contractId]);
            }
            if($serviceRequestId&&$this->workflow->supportsBooking((string)$serviceType)){ $meta=$this->json($sr->metadata_json??[]);if(($meta['paymentStage']??'')!=='balance')$this->schedule->setBookingStatus($serviceRequestId,'pending_verification');}
            $this->notifications->notify($uid,'payment_receipt_received','تم استلام إيصال الدفع',"{$serial}: الإيصال قيد المراجعة وسيصلك إشعار عند الاعتماد أو الرفض",$contractId?"/contract/{$contractId}":"/requests/{$serviceRequestId}");
            $this->notifications->notifySuperAdmins('payment_receipt_uploaded','إيصال دفع جديد يحتاج المراجعة',"{$serial} — {$amount} ج.م",'/payments',['paymentId'=>$id,'contractId'=>$contractId,'serviceRequestId'=>$serviceRequestId]);
            $this->audit->write($request,'payment.receipt_uploaded','payment',$id,null,compact('serial','amount','contractId','serviceRequestId'));
            return['id'=>$id,'serialNumber'=>$serial,'status'=>'pending_verification'];
        });
        return $this->created($request,$result,'تم استلام إيصال الدفع وهو قيد المراجعة');
    }

    public function instructions(Request $request)
    {
        $auth = $request->attributes->get('auth_user');
        if (!($auth['emailVerified'] ?? false)) {
            throw new ApiException(403, 'يجب تأكيد البريد الإلكتروني قبل عرض تعليمات الدفع', 'EMAIL_NOT_VERIFIED');
        }
        $row = DB::table('platform_settings')->select('setting_value_json')->where('setting_key', 'payments.vodafone_cash_number')->first();
        $value = $row?->setting_value_json;
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
        }
        return $this->ok($request, ['vodafoneCashNumber' => trim((string) ($value ?? ''))]);
    }

    public function my(Request $request)
    {
        $rows=DB::select('SELECT id,serial_number AS "serialNumber",amount_egp::float AS "amountEgp",status,payment_method AS "paymentMethod",contract_id AS "contractId",service_request_id AS "serviceRequestId",admin_notes AS "adminNotes",created_at AS "createdAt",reviewed_at AS "reviewedAt" FROM payments WHERE user_id=? ORDER BY created_at DESC',[$request->attributes->get('auth_user')['id']]);
        return$this->ok($request,$rows);
    }

    public function adminIndex(Request $request)
    {
        $status=$request->filled('status')?$request->string('status')->toString():null;
        $search=trim($request->string('search','')->toString());
        $paginate=$request->boolean('paginate');
        $page=max(1,(int)$request->query('page',1));
        $perPage=min(100,max(20,(int)$request->query('perPage',50)));
        $offset=($page-1)*$perPage;
        $where=['1=1'];$bindings=[];
        if($status!==null&&$status!==''){$where[]='p.status=?';$bindings[]=$status;}
        if($search!==''){$where[]='(p.serial_number ILIKE ? OR u.name ILIKE ? OR u.email ILIKE ? OR u.phone ILIKE ? OR u.whatsapp_number ILIKE ? OR c.serial_number ILIKE ? OR sr.serial_number ILIKE ? OR sr.title ILIKE ?)';$like='%'.$search.'%';array_push($bindings,$like,$like,$like,$like,$like,$like,$like,$like);}
        $whereSql=implode(' AND ',$where);
        $from=' FROM payments p JOIN users u ON u.id=p.user_id LEFT JOIN users reviewer ON reviewer.id=p.reviewed_by_admin_id LEFT JOIN contracts c ON c.id=p.contract_id LEFT JOIN service_requests sr ON sr.id=p.service_request_id LEFT JOIN document_attachments a ON a.id=p.receipt_attachment_id WHERE '.$whereSql;
        $select='SELECT p.id,p.serial_number AS "serialNumber",p.amount_egp::float AS "amountEgp",p.status,p.payment_method AS "paymentMethod",p.sender_phone AS "senderPhone",p.receipt_attachment_id AS "receiptAttachmentId",p.contract_id AS "contractId",p.service_request_id AS "serviceRequestId",p.admin_notes AS "adminNotes",p.reviewed_at AS "reviewedAt",p.created_at AS "createdAt",u.id AS "clientId",u.name AS "clientName",u.email AS "clientEmail",u.phone AS "clientPhone",u.whatsapp_number AS "clientWhatsappNumber",u.whatsapp_service_consent_at AS "clientWhatsappConsentAt",reviewer.name AS "reviewedByName",c.serial_number AS "contractSerial",sr.serial_number AS "serviceRequestSerial",sr.title AS "serviceRequestTitle",a.file_type AS "receiptMimeType",(a.thumbnail_storage_key IS NOT NULL OR a.thumbnail_file_path IS NOT NULL) AS "receiptThumbnailAvailable"';
        if(!$paginate){$rows=DB::select($select.$from.' ORDER BY p.created_at DESC LIMIT 300',$bindings);return$this->ok($request,$rows);}
        $count=DB::selectOne('SELECT COUNT(*)::int AS total'.$from,$bindings);
        $rows=DB::select($select.$from.' ORDER BY p.created_at DESC LIMIT ? OFFSET ?',array_merge($bindings,[$perPage,$offset]));
        $total=(int)($count->total??0);
        return$this->ok($request,['items'=>$rows,'pagination'=>['page'=>$page,'perPage'=>$perPage,'total'=>$total,'pages'=>max(1,(int)ceil($total/$perPage))]]);
    }

    public function approve(Request $request,int $id)
    {
        $data=$request->validate(['notes'=>['nullable','string','max:2000']]);$admin=$request->attributes->get('auth_user')['id'];
        $result=DB::transaction(function()use($request,$id,$data,$admin){
            $row=DB::selectOne('SELECT * FROM payments WHERE id=? FOR UPDATE',[$id]);if(!$row)throw new ApiException(404,'عملية الدفع غير موجودة');if($row->status!=='pending_verification')throw new ApiException(409,'تمت مراجعة هذه العملية من قبل');$editHours=null;$contract=null;$sr=null;
            if($row->contract_id){$contract=DB::selectOne('SELECT id,status,creation_mode,current_version_id FROM contracts WHERE id=? AND deleted_at IS NULL FOR UPDATE',[$row->contract_id]);if(!$contract||$contract->status!=='pending_payment')throw new ApiException(409,'حالة العقد تغيّرت بعد رفع الإيصال. لا يمكن اعتماد الدفع تلقائيًا؛ يلزم تسوية يدوية','PAYMENT_TARGET_STATE_CHANGED',['target'=>'contract','status'=>$contract->status??null]);}
            if($row->service_request_id){$sr=DB::selectOne('SELECT id,request_type,status,metadata_json FROM service_requests WHERE id=? FOR UPDATE',[$row->service_request_id]);if(!$sr||$sr->status!=='awaiting_payment')throw new ApiException(409,'حالة طلب الخدمة تغيّرت بعد رفع الإيصال. لا يمكن اعتماد الدفع تلقائيًا؛ يلزم تسوية يدوية','PAYMENT_TARGET_STATE_CHANGED',['target'=>'service_request','status'=>$sr->status??null]);$meta=$this->json($sr->metadata_json);$expected=(float)($meta['expectedPaymentEgp']??0);if($expected<=0||abs((float)$row->amount_egp-$expected)>0.009)throw new ApiException(409,'المبلغ المستحق على الطلب تغيّر بعد رفع الإيصال. راجع العملية يدويًا','PAYMENT_TARGET_AMOUNT_CHANGED',['expected'=>$expected,'receiptAmount'=>(float)$row->amount_egp]);}
            DB::table('payments')->where('id',$id)->update(['status'=>'approved','admin_notes'=>$data['notes']??null,'reviewed_by_admin_id'=>$admin,'reviewed_at'=>now()]);
            if($contract){if($contract->creation_mode==='self_service'){$policy=DB::selectOne("SELECT LEAST(168,GREATEST(1,COALESCE((setting_value_json #>> '{}')::int,24))) AS edit_hours FROM platform_settings WHERE setting_key='contracts.self_service_edit_hours'");$editHours=(int)($policy->edit_hours??24);DB::statement("UPDATE contracts SET status='client_review',core_identity_locked=TRUE,edit_window_started_at=CURRENT_TIMESTAMP,edit_expires_at=CURRENT_TIMESTAMP + (?::text || ' hours')::interval,updated_at=CURRENT_TIMESTAMP WHERE id=?",[$editHours,$row->contract_id]);if($contract->current_version_id)DB::table('contract_versions')->where('id',$contract->current_version_id)->update(['status'=>'client_review']);}else DB::statement("UPDATE contracts SET status='pending_review',updated_at=CURRENT_TIMESTAMP WHERE id=?",[$row->contract_id]);}
            if($sr){$paidRow=DB::selectOne("SELECT COALESCE(SUM(amount_egp) FILTER (WHERE status='approved'),0)::float AS amount FROM payments WHERE service_request_id=?",[$row->service_request_id]);$state=$this->servicePaymentState($sr,(int)$row->service_request_id,(float)($paidRow->amount??0));DB::statement('UPDATE service_requests SET status=?,metadata_json=?::jsonb,completed_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?',[$state['status'],json_encode($state['meta'],JSON_UNESCAPED_UNICODE),$row->service_request_id]);if($this->workflow->supportsBooking((string)$sr->request_type)&&($state['previousStage']??'')!=='balance')$this->schedule->setBookingStatus((int)$row->service_request_id,'confirmed');}
            $message=$row->contract_id&&$editHours?"يمكنك مراجعة البيانات غير الأساسية لمدة {$editHours} ساعة قبل إصدار النسخة النهائية":$row->serial_number;$this->notifications->notify((int)$row->user_id,'payment_approved','تم اعتماد الدفع',$message,$row->contract_id?"/contract/{$row->contract_id}":"/requests/{$row->service_request_id}");$this->audit->write($request,'payment.approved','payment',$id,['status'=>$row->status],['status'=>'approved','notes'=>$data['notes']??null]);return['user_id'=>$row->user_id,'contract_id'=>$row->contract_id,'service_request_id'=>$row->service_request_id,'serial_number'=>$row->serial_number,'editHours'=>$editHours];
        });
        return$this->ok($request,['id'=>$id,'status'=>'approved']+$result,'تم اعتماد الدفع');
    }

    public function requestClarification(Request $request,int $id)
    {
        $data=$request->validate(['message'=>['required','string','min:3','max:2000']]);$admin=$request->attributes->get('auth_user')['id'];
        $row=DB::transaction(function()use($request,$id,$data,$admin){
            $row=DB::selectOne('SELECT * FROM payments WHERE id=? FOR UPDATE',[$id]);if(!$row)throw new ApiException(404,'عملية الدفع غير موجودة');if($row->status!=='pending_verification')throw new ApiException(409,'لا يمكن طلب توضيح لهذه العملية في حالتها الحالية');
            DB::table('payments')->where('id',$id)->update(['status'=>'needs_client_info','admin_notes'=>$data['message'],'reviewed_by_admin_id'=>$admin,'reviewed_at'=>now()]);
            if($row->service_request_id){$sr=DB::table('service_requests')->select('request_type','metadata_json')->where('id',$row->service_request_id)->first();$m=$sr?$this->json($sr->metadata_json):[];if($sr&&$this->workflow->supportsBooking((string)$sr->request_type)&&($m['paymentStage']??'')!=='balance')$this->schedule->setBookingStatus((int)$row->service_request_id,'needs_client_info');}
            $this->notifications->notify((int)$row->user_id,'payment_clarification_requested','مطلوب توضيح بخصوص الدفع',$data['message'],$row->contract_id?"/contract/{$row->contract_id}":"/requests/{$row->service_request_id}");
            $this->audit->write($request,'payment.clarification_requested','payment',$id,['status'=>$row->status],['status'=>'needs_client_info','message'=>$data['message']]);return$row;
        });
        return$this->ok($request,['id'=>$id,'status'=>'needs_client_info','contractId'=>$row->contract_id,'serviceRequestId'=>$row->service_request_id],'تم إرسال طلب التوضيح للعميل');
    }

    public function reject(Request $request,int $id)
    {
        $data=$request->validate(['reason'=>['required','string','max:2000']]);$admin=$request->attributes->get('auth_user')['id'];
        $result=DB::transaction(function()use($request,$id,$data,$admin){
            $row=DB::selectOne('SELECT * FROM payments WHERE id=? FOR UPDATE',[$id]);if(!$row)throw new ApiException(404,'عملية الدفع غير موجودة');if(!in_array($row->status,['pending_verification','needs_client_info'],true))throw new ApiException(409,'تمت مراجعة هذه العملية من قبل');
            DB::table('payments')->where('id',$id)->update(['status'=>'rejected','admin_notes'=>$data['reason'],'reviewed_by_admin_id'=>$admin,'reviewed_at'=>now()]);
            if($row->service_request_id){$sr=DB::table('service_requests')->select('request_type','metadata_json')->where('id',$row->service_request_id)->first();$m=$sr?$this->json($sr->metadata_json):[];if($sr&&$this->workflow->supportsBooking((string)$sr->request_type)&&($m['paymentStage']??'')!=='balance')$this->schedule->setBookingStatus((int)$row->service_request_id,'cancelled');}
            $this->notifications->notify((int)$row->user_id,'payment_rejected','تعذر اعتماد الدفع',$data['reason'],$row->contract_id?"/contract/{$row->contract_id}":"/requests/{$row->service_request_id}");
            $this->audit->write($request,'payment.rejected','payment',$id,['status'=>$row->status],['status'=>'rejected','reason'=>$data['reason']]);
            return['user_id'=>$row->user_id,'contract_id'=>$row->contract_id,'service_request_id'=>$row->service_request_id,'serial_number'=>$row->serial_number];
        });
        return$this->ok($request,['id'=>$id,'status'=>'rejected']+$result,'تم رفض الإيصال وإشعار العميل');
    }

    public function recordManual(Request $request)
    {
        $data=$request->validate([
            'contractId'=>['nullable','integer','min:1'],'serviceRequestId'=>['nullable','integer','min:1'],'amountEgp'=>['required','numeric','min:0.01'],
            'paymentMethod'=>['required','in:cash,bank_transfer,external_transfer,vodafone_cash'],'reference'=>['nullable','string','max:255'],'notes'=>['nullable','string','max:2000'],
        ]);
        $contractId=$data['contractId']??null;$serviceRequestId=$data['serviceRequestId']??null;if((bool)$contractId===(bool)$serviceRequestId)throw new ApiException(422,'حدد عقدًا واحدًا أو طلب خدمة واحدًا');
        $admin=(int)$request->attributes->get('auth_user')['id'];$serial='PAY-'.now()->year.'-'.strtoupper(substr(bin2hex(random_bytes(5)),0,8));
        $result=DB::transaction(function()use($request,$data,$contractId,$serviceRequestId,$admin,$serial){
            $userId=null;
            if($contractId){
                $c=DB::selectOne('SELECT id,user_id,client_user_id,source_channel,status,creation_mode,current_version_id,original_price_egp FROM contracts WHERE id=? AND deleted_at IS NULL FOR UPDATE',[$contractId]);if(!$c)throw new ApiException(404,'العقد غير موجود');
                if(($c->source_channel??'customer')==='office'&&!$c->client_user_id)throw new ApiException(409,'اربط العقد بعميل مسجل قبل تسجيل تحصيل مالي باسمه','CLIENT_REQUIRED_FOR_PAYMENT');$userId=(int)($c->client_user_id?:$c->user_id);
                if($c->status==='pending_payment'&&$c->creation_mode==='self_service'){
                    $expected=(float)$c->original_price_egp;if(abs((float)$data['amountEgp']-$expected)>0.009)throw new ApiException(422,"المبلغ المطلوب لهذا العقد هو {$expected} ج.م",'PAYMENT_AMOUNT_MISMATCH');
                    $policy=DB::selectOne("SELECT LEAST(168,GREATEST(1,COALESCE((setting_value_json #>> '{}')::int,24))) AS edit_hours FROM platform_settings WHERE setting_key='contracts.self_service_edit_hours'");$editHours=(int)($policy->edit_hours??24);
                    DB::statement("UPDATE contracts SET billing_mode='external_collection',status='client_review',core_identity_locked=TRUE,edit_window_started_at=CURRENT_TIMESTAMP,edit_expires_at=CURRENT_TIMESTAMP + (?::text || ' hours')::interval,updated_at=CURRENT_TIMESTAMP WHERE id=?",[$editHours,$contractId]);
                    if($c->current_version_id)DB::table('contract_versions')->where('id',$c->current_version_id)->update(['status'=>'client_review']);
                }else{
                    DB::table('contracts')->where('id',$contractId)->update(['billing_mode'=>'external_collection','status'=>$c->status==='pending_payment'?'pending_review':$c->status,'updated_at'=>now()]);
                }
            }
            if($serviceRequestId){
                $sr=DB::selectOne('SELECT id,client_user_id,request_type,status,metadata_json FROM service_requests WHERE id=? FOR UPDATE',[$serviceRequestId]);if(!$sr)throw new ApiException(404,'طلب الخدمة غير موجود');$userId=(int)$sr->client_user_id;if($sr->status!=='awaiting_payment')throw new ApiException(409,'هذا الطلب لا ينتظر تحصيلًا حاليًا','PAYMENT_NOT_ALLOWED');$meta=$this->json($sr->metadata_json);$expected=(float)($meta['expectedPaymentEgp']??0);if($expected<=0)throw new ApiException(409,'لا يوجد مبلغ مستحق مثبت لهذا الطلب','SERVICE_PAYMENT_NOT_REQUIRED');if(abs((float)$data['amountEgp']-$expected)>0.009)throw new ApiException(422,"المبلغ المستحق حاليًا هو {$expected} ج.م",'PAYMENT_AMOUNT_MISMATCH');$paidRow=DB::selectOne("SELECT COALESCE(SUM(amount_egp) FILTER (WHERE status='approved'),0)::float AS amount FROM payments WHERE service_request_id=?",[$serviceRequestId]);$state=$this->servicePaymentState($sr,$serviceRequestId,(float)($paidRow->amount??0)+(float)$data['amountEgp']);DB::statement('UPDATE service_requests SET status=?,metadata_json=?::jsonb,completed_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?',[$state['status'],json_encode($state['meta'],JSON_UNESCAPED_UNICODE),$serviceRequestId]);if($this->workflow->supportsBooking((string)$sr->request_type)&&($state['previousStage']??'')!=='balance')$this->schedule->setBookingStatus($serviceRequestId,'confirmed');
            }
            if(!$userId)throw new ApiException(409,'لا يوجد عميل مرتبط يمكن تسجيل التحصيل باسمه');
            $notes=trim(($data['reference']??'')!==''?'مرجع: '.$data['reference'].'\n'.($data['notes']??''):($data['notes']??''));
            $row=DB::selectOne("INSERT INTO payments(serial_number,user_id,contract_id,service_request_id,amount_egp,payment_method,status,admin_notes,reviewed_by_admin_id,reviewed_at) VALUES (?,?,?,?,?,?,'approved',?,?,CURRENT_TIMESTAMP) RETURNING id",[$serial,$userId,$contractId,$serviceRequestId,$data['amountEgp'],$data['paymentMethod'],$notes?:null,$admin]);
            $this->audit->write($request,'payment.manual_recorded','payment',(int)$row->id,null,['serialNumber'=>$serial,'contractId'=>$contractId,'serviceRequestId'=>$serviceRequestId,'amountEgp'=>(float)$data['amountEgp'],'paymentMethod'=>$data['paymentMethod'],'reference'=>$data['reference']??null]);
            $this->notifications->notify($userId,'payment_recorded','تم تسجيل الدفع',"تم تسجيل دفعة بقيمة {$data['amountEgp']} ج.م",$contractId?"/contract/{$contractId}":"/requests/{$serviceRequestId}");
            return['id'=>(int)$row->id,'serialNumber'=>$serial,'status'=>'approved'];
        });
        return$this->created($request,$result,'تم تسجيل التحصيل اليدوي');
    }

    private function servicePaymentState(object $sr,int $serviceRequestId,float $approvedTotal): array
    {
        $meta=$this->json($sr->metadata_json);$stage=(string)($meta['paymentStage']??'deposit');$total=(float)($meta['serviceTotalPriceEgp']??$meta['lawyerTotalPriceEgp']??0);$remaining=max(0.0,$total-$approvedTotal);$meta['serviceRemainingEgp']=$remaining;if($sr->request_type==='contract_drafting')$meta['lawyerRemainingEgp']=$remaining;
        if(in_array((string)$sr->request_type,['contract_drafting','contract_review'],true)){
            if($stage==='balance'){$status=$remaining<=0.009?'client_review':'awaiting_payment';$meta['expectedPaymentEgp']=$remaining;$meta['paymentStage']=$remaining<=0.009?'paid':'balance';}
            else{$deposit=(float)($meta['serviceDepositEgp']??$meta['lawyerDepositEgp']??$meta['expectedPaymentEgp']??0);$status=$approvedTotal+0.009>=$deposit?'new':'awaiting_payment';if($status==='new'){$meta['paymentStage']='working';$meta['expectedPaymentEgp']=0;}}
        }else{$status='new';$meta['expectedPaymentEgp']=0;$meta['serviceRemainingEgp']=$remaining;$meta['paymentStage']='paid';}
        return ['status'=>$status,'meta'=>$meta,'previousStage'=>$stage];
    }

    private function json(mixed $value): array
    {
        if(is_array($value))return$value;if(is_object($value))return(array)$value;if(is_string($value))return json_decode($value,true)?:[];return[];
    }
    private function jsonList(mixed $value): array{return array_values(array_map('strval',$this->json($value)));}
}
