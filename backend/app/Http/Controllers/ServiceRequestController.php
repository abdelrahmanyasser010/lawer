<?php
namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Services\AuditService;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

final class ServiceRequestController extends Controller
{
    use ApiResponse;
    private const CHANNELS=['office','zoom','whatsapp'];
    private const STATUSES=['awaiting_payment','new','assigned','awaiting_client_info','meeting_scheduled','in_progress','client_review','revision_requested','completed','cancelled'];
    public function __construct(private NotificationService $notifications,private AuditService $audit){}

    public function create(Request $request)
    {
        $auth=$this->auth($request);$this->verified($auth);
        $data=$request->validate([
            'requestType'=>['required','in:contract_drafting,contract_review,consultation'],'title'=>['required','string','max:255'],
            'description'=>['required','string','min:10','max:10000'],'communicationChannel'=>['nullable','in:office,zoom,whatsapp'],
            'meetingPreference'=>['nullable','in:office,zoom,whatsapp'],'preferredAt'=>['nullable','date'],'attachmentIds'=>['nullable','array','max:30'],'attachmentIds.*'=>['integer','min:1'],
            'paymentRequired'=>['nullable','boolean'],'priority'=>['nullable','in:normal,high'],'templateSlug'=>['nullable','string','max:100'],'clientContactSnapshot'=>['nullable','array'],
        ]);
        $channel=$data['communicationChannel']??$data['meetingPreference']??'whatsapp';$preferred=!empty($data['preferredAt'])?date(DATE_ATOM,strtotime($data['preferredAt'])):null;
        $serial=$this->serial($data['requestType']);$status=($data['paymentRequired']??false)?'awaiting_payment':'new';$attachmentIds=array_values(array_unique(array_map('intval',$data['attachmentIds']??[])));
        $result=DB::transaction(function()use($request,$auth,$data,$channel,$preferred,$serial,$status,$attachmentIds){
            $row=DB::selectOne("INSERT INTO service_requests (serial_number,request_type,source_channel,client_user_id,title,status,priority,due_at,communication_channel,preferred_contact_at,metadata_json) VALUES (?,?,'customer',?,?,?,?,?,?,?,?::jsonb) RETURNING id",[
                $serial,$data['requestType'],$auth['id'],$data['title'],$status,$data['priority']??'normal',$preferred,$channel,$preferred,json_encode(['description'=>$data['description'],'templateSlug'=>$data['templateSlug']??null,'clientContactSnapshot'=>$data['clientContactSnapshot']??null],JSON_UNESCAPED_UNICODE)
            ]);$id=(int)$row->id;$this->linkAttachments($attachmentIds,$auth['id'],$id);
            DB::insert("INSERT INTO service_request_events(service_request_id,actor_user_id,event_type,notes,payload_json,visibility) VALUES (?,?,'request_created','تم استلام الطلب',?::jsonb,'client')",[$id,$auth['id'],json_encode(['status'=>$status,'communicationChannel'=>$channel],JSON_UNESCAPED_UNICODE)]);
            $this->notifications->notifySuperAdmins('service_request_created','طلب خدمة جديد',"{$serial}: {$data['title']}","/work/{$id}",['requestType'=>$data['requestType'],'communicationChannel'=>$channel]);
            $this->audit->write($request,'service_request.created','service_request',$id,null,['serialNumber'=>$serial,'requestType'=>$data['requestType'],'title'=>$data['title'],'communicationChannel'=>$channel,'attachmentIds'=>$attachmentIds]);
            return ['id'=>$id,'serialNumber'=>$serial,'status'=>$status];
        });
        return $this->created($request,$result,'تم استلام طلبك. يمكنك متابعة حالته والملفات الناتجة من حسابك');
    }

    public function my(Request $request)
    {
        $uid=$this->auth($request)['id'];$rows=DB::select('SELECT sr.id,sr.serial_number AS "serialNumber",sr.request_type AS "requestType",sr.title,sr.status,sr.priority,sr.communication_channel AS "communicationChannel",sr.preferred_contact_at AS "preferredContactAt",sr.meeting_at AS "meetingAt",sr.meeting_provider AS "meetingProvider",sr.meeting_url AS "meetingUrl",sr.linked_contract_id AS "linkedContractId",sr.created_at AS "createdAt",sr.updated_at AS "updatedAt",lawyer.name AS "assignedLawyerName",(SELECT COUNT(*)::int FROM service_request_deliverables d WHERE d.service_request_id=sr.id) AS "deliverablesCount",(SELECT notes FROM service_request_events e WHERE e.service_request_id=sr.id AND e.visibility=\'client\' ORDER BY e.created_at DESC LIMIT 1) AS "lastUpdate" FROM service_requests sr LEFT JOIN users lawyer ON lawyer.id=sr.assigned_lawyer_id WHERE sr.client_user_id=? ORDER BY sr.updated_at DESC,sr.created_at DESC',[$uid]);
        return $this->ok($request,$rows);
    }

    public function show(Request $request,int $id)
    {
        $auth=$this->auth($request);$row=$this->load($id);$isClient=(int)$row->client_user_id===$auth['id'];$isStaff=(int)($row->assigned_lawyer_id??0)===$auth['id']||in_array('super_admin',$auth['roles']??[],true)||in_array('requests.view_all',$auth['permissions']??[],true);if(!$isClient&&!$isStaff)throw new ApiException(403,'ليس لديك صلاحية عرض الطلب');
        $events=DB::select('SELECT id,event_type AS "eventType",notes,payload_json AS payload,created_at AS "createdAt" FROM service_request_events WHERE service_request_id=? AND (?::boolean=FALSE OR visibility=\'client\') ORDER BY created_at',[$id,$isClient]);
        foreach ($events as $event) {
            $event->payload = $this->json($event->payload);
        }
        $attachments=DB::select('SELECT a.id,COALESCE(a.original_file_name,a.file_name) AS "fileName",a.file_type AS "fileType",a.file_size_bytes AS "sizeBytes",a.created_at AS "createdAt" FROM document_attachments a WHERE a.attachable_type=\'service_request\' AND a.attachable_id=? AND NOT EXISTS (SELECT 1 FROM service_request_deliverables d WHERE d.attachment_id=a.id) AND (?::boolean=FALSE OR a.owner_user_id=?) ORDER BY a.created_at',[$id,$isClient,$auth['id']]);
        $deliverables=DB::select('SELECT d.id,d.deliverable_type AS "type",d.version_number AS "versionNumber",d.title,d.notes,d.is_final AS "isFinal",d.published_at AS "publishedAt",d.attachment_id AS "attachmentId",COALESCE(a.original_file_name,a.file_name) AS "fileName",a.file_type AS "fileType",a.file_size_bytes AS "sizeBytes" FROM service_request_deliverables d JOIN document_attachments a ON a.id=d.attachment_id WHERE d.service_request_id=? ORDER BY d.published_at DESC',[$id]);
        $meta=$this->json($row->metadata_json);
        return $this->ok($request,[
            'id'=>$row->id,'serialNumber'=>$row->serial_number,'requestType'=>$row->request_type,'title'=>$row->title,'status'=>$row->status,'priority'=>$row->priority,
            'description'=>$meta['description']??'','templateSlug'=>$meta['templateSlug']??null,'communicationChannel'=>$row->communication_channel,'preferredContactAt'=>$row->preferred_contact_at,
            'meetingAt'=>$row->meeting_at??$row->due_at,'meetingProvider'=>$row->meeting_provider,'meetingUrl'=>$row->meeting_url,'meetingLocation'=>$row->meeting_location,
            'assignedLawyerId'=>$row->assigned_lawyer_id,'assignedLawyerName'=>$row->assigned_lawyer_name,'clientUserId'=>$row->client_user_id,'clientName'=>$row->client_name,'clientPhone'=>$row->client_phone,'clientWhatsappNumber'=>$row->client_whatsapp_number,
            'dueAt'=>$row->due_at,'linkedContractId'=>$row->linked_contract_id,'linkedContractSerial'=>$row->linked_contract_serial,'linkedContractTitle'=>$row->linked_contract_title,
            'paymentStatus'=>$row->payment_status,'paymentAmountEgp'=>$row->payment_amount_egp,'paymentAdminNotes'=>$row->payment_admin_notes,'createdAt'=>$row->created_at,'updatedAt'=>$row->updated_at,
            'events'=>$events,'attachments'=>$attachments,'deliverables'=>$deliverables,'permissions'=>['canUploadFiles'=>$isClient&&!in_array($row->status,['completed','cancelled'],true),'canRequestRevision'=>$isClient&&in_array($row->status,['client_review','completed'],true),'canConfirmReceipt'=>$isClient&&$row->status==='client_review'&&count($deliverables)>0]
        ]);
    }

    public function appendAttachments(Request $request,int $id)
    {
        $auth=$this->auth($request);$this->verified($auth);$row=$this->load($id);if((int)$row->client_user_id!==$auth['id'])throw new ApiException(403,'إضافة الملفات متاحة لصاحب الطلب فقط');if(in_array($row->status,['completed','cancelled'],true))throw new ApiException(409,'الطلب مغلق ولا يقبل ملفات جديدة');
        $data=$request->validate(['attachmentIds'=>['required','array','min:1','max:30'],'attachmentIds.*'=>['integer','min:1']]);$ids=array_values(array_unique(array_map('intval',$data['attachmentIds'])));
        DB::transaction(function()use($request,$auth,$row,$id,$ids){$this->linkAttachments($ids,$auth['id'],$id);DB::table('service_requests')->where('id',$id)->update(['updated_at'=>now()]);DB::insert("INSERT INTO service_request_events(service_request_id,actor_user_id,event_type,notes,payload_json,visibility) VALUES (?,?,'client_files_added','تم رفع مستندات جديدة',?::jsonb,'client')",[$id,$auth['id'],json_encode(['attachmentIds'=>$ids])]);if($row->assigned_lawyer_id)$this->notifications->notify((int)$row->assigned_lawyer_id,'request_files_added','رفع العميل مستندات جديدة',$row->serial_number,"/work/{$id}");else$this->notifications->notifySuperAdmins('request_files_added','رفع العميل مستندات جديدة',$row->serial_number,"/work/{$id}");$this->audit->write($request,'service_request.files_added','service_request',$id,null,['attachmentIds'=>$ids]);});
        return $this->ok($request,['id'=>$id,'attachmentIds'=>$ids],'تمت إضافة الملفات إلى الطلب');
    }

    public function requestRevision(Request $request,int $id)
    {
        $auth=$this->auth($request);$this->verified($auth);$row=$this->load($id);if((int)$row->client_user_id!==$auth['id'])throw new ApiException(403,'طلب التعديل متاح لصاحب الطلب فقط');if(!in_array($row->status,['client_review','completed'],true))throw new ApiException(409,'لا توجد نسخة معروضة حاليًا لطلب تعديلها');$data=$request->validate(['note'=>['required','string','max:2000']]);
        DB::transaction(function()use($request,$auth,$row,$id,$data){DB::statement("UPDATE service_requests SET status='revision_requested',client_confirmed_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?",[$id]);DB::insert("INSERT INTO service_request_events(service_request_id,actor_user_id,event_type,notes,payload_json,visibility) VALUES (?,?,'revision_requested',?,'{}'::jsonb,'client')",[$id,$auth['id'],$data['note']]);if($row->assigned_lawyer_id)$this->notifications->notify((int)$row->assigned_lawyer_id,'request_revision_requested','طلب العميل تعديلًا',$row->serial_number,"/work/{$id}",['note'=>$data['note']]);else$this->notifications->notifySuperAdmins('request_revision_requested','طلب العميل تعديلًا',$row->serial_number,"/work/{$id}",['note'=>$data['note']]);$this->audit->write($request,'service_request.revision_requested','service_request',$id,null,['note'=>$data['note']]);});
        return $this->ok($request,['id'=>$id,'status'=>'revision_requested'],'تم تسجيل طلب التعديل');
    }

    public function confirmReceipt(Request $request,int $id)
    {
        $auth=$this->auth($request);$this->verified($auth);$row=$this->load($id);if((int)$row->client_user_id!==$auth['id'])throw new ApiException(403,'تأكيد الاستلام متاح لصاحب الطلب فقط');if($row->status!=='client_review')throw new ApiException(409,'الطلب ليس في مرحلة مراجعة النتيجة');
        DB::transaction(function()use($request,$auth,$id){DB::statement("UPDATE service_requests SET status='completed',client_confirmed_at=CURRENT_TIMESTAMP,completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",[$id]);DB::insert("INSERT INTO service_request_events(service_request_id,actor_user_id,event_type,notes,payload_json,visibility) VALUES (?,?,'client_confirmed','أكد العميل استلام ومراجعة النسخة','{}'::jsonb,'client')",[$id,$auth['id']]);$this->audit->write($request,'service_request.client_confirmed','service_request',$id);});
        return $this->ok($request,['id'=>$id,'status'=>'completed'],'تم تأكيد الاستلام وإنهاء الطلب');
    }

    public function adminIndex(Request $request)
    {
        $auth=$this->auth($request);$type=$request->filled('type')?$request->string('type')->toString():null;$status=$request->filled('status')?$request->string('status')->toString():null;$viewAll=in_array('super_admin',$auth['roles']??[],true)||in_array('requests.view_all',$auth['permissions']??[],true);$assignedToMe=!$viewAll||$request->boolean('assignedToMe');
        $rows=DB::select('SELECT sr.id,sr.serial_number AS "serialNumber",sr.request_type AS "requestType",sr.title,sr.status,sr.priority,sr.communication_channel AS "communicationChannel",sr.meeting_at AS "meetingAt",sr.meeting_url AS "meetingUrl",sr.linked_contract_id AS "linkedContractId",sr.created_at AS "createdAt",client.name AS "clientName",client.phone AS "clientPhone",client.whatsapp_number AS "clientWhatsappNumber",lawyer.name AS "assignedLawyerName" FROM service_requests sr LEFT JOIN users client ON client.id=sr.client_user_id LEFT JOIN users lawyer ON lawyer.id=sr.assigned_lawyer_id WHERE (?::text IS NULL OR sr.request_type=?) AND (?::text IS NULL OR sr.status=?) AND (?::boolean=FALSE OR sr.assigned_lawyer_id=?) ORDER BY CASE WHEN sr.priority=\'high\' THEN 0 ELSE 1 END,sr.due_at NULLS LAST,sr.created_at DESC LIMIT 300',[$type,$type,$status,$status,$assignedToMe,$auth['id']]);
        return $this->ok($request,$rows);
    }

    public function assign(Request $request,int $id)
    {
        if(!config('zdraft.features.assignment'))throw new ApiException(404,'ميزة إسناد المحامين مخفية حاليًا','FEATURE_DISABLED');$data=$request->validate(['lawyerId'=>['required','integer','min:1']]);$lawyer=DB::selectOne("SELECT 1 FROM users u JOIN staff_role_assignments sra ON sra.user_id=u.id JOIN roles r ON r.id=sra.role_id WHERE u.id=? AND r.role_key='lawyer' AND u.status='active'",[$data['lawyerId']]);if(!$lawyer)throw new ApiException(400,'الحساب المختار ليس محاميًا نشطًا');$auth=$this->auth($request);
        $result=DB::transaction(function()use($request,$id,$data,$auth){$row=DB::selectOne("UPDATE service_requests SET assigned_lawyer_id=?,status='assigned',updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING client_user_id,serial_number",[$data['lawyerId'],$id]);if(!$row)throw new ApiException(404,'الطلب غير موجود');$this->notifications->notify((int)$data['lawyerId'],'service_request_assigned','تم إسناد طلب جديد',$row->serial_number,"/work/{$id}");if($row->client_user_id)$this->notifications->notify((int)$row->client_user_id,'lawyer_assigned','تم إسناد طلبك لمحامٍ',$row->serial_number,"/requests/{$id}");DB::insert("INSERT INTO service_request_events(service_request_id,actor_user_id,event_type,notes,payload_json,visibility) VALUES (?,?,'assigned','تم إسناد الطلب إلى المحامي',?::jsonb,'client')",[$id,$auth['id'],json_encode(['lawyerId'=>$data['lawyerId']])]);$this->audit->write($request,'service_request.assigned','service_request',$id,null,['lawyerId'=>$data['lawyerId']]);return['client_user_id'=>$row->client_user_id,'serial_number'=>$row->serial_number];});
        return $this->ok($request,['id'=>$id,'lawyerId'=>(int)$data['lawyerId']]+$result,'تم إسناد الطلب');
    }

    public function status(Request $request,int $id)
    {
        $this->assertStaffAccess($request,$id);$data=$request->validate(['status'=>['required','in:'.implode(',',self::STATUSES)],'notes'=>['nullable','string','max:2000'],'visibleToClient'=>['nullable','boolean']]);$auth=$this->auth($request);$visible=$data['visibleToClient']??true;
        $result=DB::transaction(function()use($request,$id,$data,$auth,$visible){$row=DB::selectOne("UPDATE service_requests SET status=?,completed_at=CASE WHEN ?='completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING client_user_id,serial_number,status",[$data['status'],$data['status'],$id]);if(!$row)throw new ApiException(404,'الطلب غير موجود');DB::insert("INSERT INTO service_request_events(service_request_id,actor_user_id,event_type,notes,payload_json,visibility) VALUES (?,?,'status_changed',?,?::jsonb,?)",[$id,$auth['id'],$data['notes']??null,json_encode(['status'=>$data['status']]),$visible?'client':'internal']);if($visible&&$row->client_user_id)$this->notifications->notify((int)$row->client_user_id,'request_status_changed','تحديث على طلبك',$data['notes']??$row->serial_number,"/requests/{$id}");$this->audit->write($request,'service_request.status_changed','service_request',$id,null,['status'=>$data['status'],'notes'=>$data['notes']??null,'visibleToClient'=>$visible]);return['client_user_id'=>$row->client_user_id,'serial_number'=>$row->serial_number,'status'=>$row->status];});
        return $this->ok($request,$result,'تم تحديث حالة الطلب');
    }

    public function meeting(Request $request,int $id)
    {
        $this->assertStaffAccess($request,$id);$data=$request->validate(['provider'=>['required','in:office,zoom,whatsapp'],'scheduledAt'=>['required','date','after:now'],'meetingUrl'=>['nullable','string','max:2000'],'meetingLocation'=>['nullable','string','max:1000']]);if($data['provider']==='zoom'&&empty($data['meetingUrl']))throw new ApiException(422,'رابط Zoom مطلوب');if($data['provider']==='office'&&empty($data['meetingLocation']))throw new ApiException(422,'عنوان المكتب مطلوب');$auth=$this->auth($request);$scheduled=date(DATE_ATOM,strtotime($data['scheduledAt']));
        $row=DB::transaction(function()use($request,$id,$data,$auth,$scheduled){$updated=DB::selectOne("UPDATE service_requests SET communication_channel=?,meeting_provider=?,meeting_url=?,meeting_location=?,meeting_at=?,due_at=?,status='meeting_scheduled',updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING client_user_id,serial_number",[$data['provider'],$data['provider'],$data['meetingUrl']??null,$data['meetingLocation']??null,$scheduled,$scheduled,$id]);if(!$updated)throw new ApiException(404,'الطلب غير موجود');DB::insert("INSERT INTO service_request_events(service_request_id,actor_user_id,event_type,notes,payload_json,visibility) VALUES (?,?,'meeting_scheduled','تم تحديد موعد التواصل',?::jsonb,'client')",[$id,$auth['id'],json_encode(['provider'=>$data['provider'],'scheduledAt'=>$scheduled,'meetingUrl'=>$data['meetingUrl']??null,'meetingLocation'=>$data['meetingLocation']??null],JSON_UNESCAPED_UNICODE)]);if($updated->client_user_id)$this->notifications->notify((int)$updated->client_user_id,'meeting_scheduled','تم تحديد موعد التواصل',$scheduled,"/requests/{$id}");$this->audit->write($request,'service_request.meeting_scheduled','service_request',$id,null,['provider'=>$data['provider'],'scheduledAt'=>$scheduled,'meetingUrl'=>$data['meetingUrl']??null,'meetingLocation'=>$data['meetingLocation']??null]);return$updated;});
        return $this->ok($request,['id'=>$id,'client_user_id'=>$row->client_user_id,'serial_number'=>$row->serial_number,'provider'=>$data['provider'],'scheduledAt'=>$scheduled,'meetingUrl'=>$data['meetingUrl']??null,'meetingLocation'=>$data['meetingLocation']??null],'تم تحديد الموعد وإشعار العميل');
    }

    public function clientUpdate(Request $request,int $id)
    {
        $this->assertStaffAccess($request,$id);$data=$request->validate(['note'=>['required','string','max:2000']]);$row=$this->load($id);$auth=$this->auth($request);DB::transaction(function()use($request,$id,$data,$row,$auth){DB::table('service_requests')->where('id',$id)->update(['updated_at'=>now()]);DB::insert("INSERT INTO service_request_events(service_request_id,actor_user_id,event_type,notes,payload_json,visibility) VALUES (?,?,'client_update',?,'{}'::jsonb,'client')",[$id,$auth['id'],$data['note']]);if($row->client_user_id)$this->notifications->notify((int)$row->client_user_id,'request_update','تحديث على طلبك',$data['note'],"/requests/{$id}");$this->audit->write($request,'service_request.client_update_added','service_request',$id,null,['note'=>$data['note']]);});return $this->ok($request,['id'=>$id],'تم نشر التحديث في حساب العميل');
    }

    public function deliverable(Request $request,int $id)
    {
        $this->assertStaffAccess($request,$id);$data=$request->validate(['attachmentId'=>['required','integer','min:1'],'type'=>['required','in:review_report,revised_document,final_document,supporting_document'],'title'=>['required','string','max:255'],'notes'=>['nullable','string','max:2000'],'isFinal'=>['nullable','boolean']]);$auth=$this->auth($request);$row=$this->load($id);$isFinal=($data['isFinal']??false)||$data['type']==='final_document';
        $result=DB::transaction(function()use($request,$id,$data,$auth,$row,$isFinal){$a=DB::selectOne("SELECT id FROM document_attachments WHERE id=? AND owner_user_id=? AND attachable_type='pending' FOR UPDATE",[$data['attachmentId'],$auth['id']]);if(!$a)throw new ApiException(400,'الملف غير موجود أو تم استخدامه من قبل');$next=DB::selectOne('SELECT COALESCE(MAX(version_number),0)+1 AS next FROM service_request_deliverables WHERE service_request_id=? AND deliverable_type=?',[$id,$data['type']]);$version=(int)$next->next;$inserted=DB::selectOne('INSERT INTO service_request_deliverables(service_request_id,attachment_id,deliverable_type,version_number,title,notes,is_final,published_by) VALUES (?,?,?,?,?,?,?,?) RETURNING id',[$id,$data['attachmentId'],$data['type'],$version,$data['title'],$data['notes']??null,$isFinal,$auth['id']]);DB::table('document_attachments')->where('id',$data['attachmentId'])->update(['attachable_type'=>'service_request','attachable_id'=>$id,'visibility'=>'client']);DB::statement("UPDATE service_requests SET status='client_review',updated_at=CURRENT_TIMESTAMP WHERE id=?",[$id]);DB::insert("INSERT INTO service_request_events(service_request_id,actor_user_id,event_type,notes,payload_json,visibility) VALUES (?,?,'deliverable_published',?,?::jsonb,'client')",[$id,$auth['id'],$data['notes']??'تمت إتاحة نسخة جديدة في حسابك',json_encode(['deliverableId'=>$inserted->id,'deliverableType'=>$data['type'],'versionNumber'=>$version,'title'=>$data['title'],'isFinal'=>$isFinal],JSON_UNESCAPED_UNICODE)]);if($row->client_user_id)$this->notifications->notify((int)$row->client_user_id,'request_deliverable_ready','أصبحت نسخة جديدة جاهزة',$data['title'],"/requests/{$id}");$this->audit->write($request,'service_request.deliverable_published','service_request_deliverable',(int)$inserted->id,null,['requestId'=>$id,'attachmentId'=>$data['attachmentId'],'deliverableType'=>$data['type'],'versionNumber'=>$version,'isFinal'=>$isFinal]);return['id'=>(int)$inserted->id,'versionNumber'=>$version];});
        return $this->created($request,$result,'تمت إتاحة الملف في حساب العميل');
    }

    public function linkContract(Request $request,int $id)
    {
        $this->assertStaffAccess($request,$id);$data=$request->validate(['contractId'=>['required','integer','min:1']]);$row=$this->load($id);$auth=$this->auth($request);$viewAll=in_array('super_admin',$auth['roles']??[],true)||in_array('contracts.view_all',$auth['permissions']??[],true);$contract=DB::selectOne('SELECT id,serial_number,client_user_id,user_id FROM contracts WHERE id=? AND deleted_at IS NULL AND (?::boolean=TRUE OR assigned_lawyer_id=? OR created_by_user_id=?)',[$data['contractId'],$viewAll,$auth['id'],$auth['id']]);if(!$contract)throw new ApiException(404,'العقد غير موجود أو غير متاح لك');if($row->client_user_id&&!in_array((int)$row->client_user_id,[(int)($contract->client_user_id??0),(int)$contract->user_id],true))throw new ApiException(409,'العقد لا يخص صاحب الطلب');
        DB::transaction(function()use($request,$id,$data,$auth,$row,$contract){DB::statement("UPDATE service_requests SET linked_contract_id=?,status='in_progress',updated_at=CURRENT_TIMESTAMP WHERE id=?",[$data['contractId'],$id]);DB::insert("INSERT INTO service_request_events(service_request_id,actor_user_id,event_type,notes,payload_json,visibility) VALUES (?,?,'contract_linked','بدأ إعداد العقد',?::jsonb,'client')",[$id,$auth['id'],json_encode(['contractId'=>$data['contractId'],'serialNumber'=>$contract->serial_number],JSON_UNESCAPED_UNICODE)]);if($row->client_user_id)$this->notifications->notify((int)$row->client_user_id,'request_contract_linked','بدأ إعداد عقدك',$contract->serial_number,"/contract/{$data['contractId']}");$this->audit->write($request,'service_request.contract_linked','service_request',$id,null,['contractId'=>$data['contractId']]);});return $this->ok($request,['id'=>$id,'contractId'=>(int)$data['contractId']],'تم ربط العقد بالطلب وسيظهر في حساب العميل');
    }

    private function auth(Request $request):array{return$request->attributes->get('auth_user')??throw new ApiException(401,'يجب تسجيل الدخول أولًا','UNAUTHENTICATED');}
    private function verified(array $auth):void{if(!($auth['emailVerified']??false))throw new ApiException(403,'يجب تأكيد البريد الإلكتروني أولًا','EMAIL_NOT_VERIFIED');}
    private function serial(string $type):string{$prefix=$type==='contract_review'?'REV':($type==='consultation'?'CON':'REQ');return$prefix.'-'.now()->year.'-'.strtoupper(substr(bin2hex(random_bytes(5)),0,8));}
    private function json(mixed $value):array{if(is_array($value))return$value;if(is_object($value))return(array)$value;if(is_string($value)){return json_decode($value,true)?:[];}return[];}
    private function linkAttachments(array $ids,int $owner,int $requestId):void{if(!$ids)return;$owned=DB::select('SELECT id FROM document_attachments WHERE id=ANY(?::bigint[]) AND owner_user_id=? AND attachable_type=\'pending\' FOR UPDATE',['{'.implode(',',$ids).'}',$owner]);if(count($owned)!==count($ids))throw new ApiException(400,'يوجد ملف غير صالح أو مرتبط بطلب آخر');DB::statement('UPDATE document_attachments SET attachable_type=\'service_request\',attachable_id=? WHERE id=ANY(?::bigint[])',[$requestId,'{'.implode(',',$ids).'}']);}
    private function load(int $id):object{$row=DB::selectOne('SELECT sr.*,lawyer.name AS assigned_lawyer_name,client.name AS client_name,client.phone AS client_phone,client.whatsapp_number AS client_whatsapp_number,c.serial_number AS linked_contract_serial,c.title AS linked_contract_title,p.status AS payment_status,p.amount_egp::float AS payment_amount_egp,p.admin_notes AS payment_admin_notes FROM service_requests sr LEFT JOIN users lawyer ON lawyer.id=sr.assigned_lawyer_id LEFT JOIN users client ON client.id=sr.client_user_id LEFT JOIN contracts c ON c.id=sr.linked_contract_id LEFT JOIN LATERAL (SELECT status,amount_egp,admin_notes FROM payments WHERE service_request_id=sr.id ORDER BY created_at DESC LIMIT 1) p ON TRUE WHERE sr.id=?',[$id]);if(!$row)throw new ApiException(404,'الطلب غير موجود');return$row;}
    private function assertStaffAccess(Request $request,int $id):void{$auth=$this->auth($request);if(in_array('super_admin',$auth['roles']??[],true)||in_array('requests.view_all',$auth['permissions']??[],true))return;$row=DB::selectOne('SELECT 1 FROM service_requests WHERE id=? AND assigned_lawyer_id=?',[$id,$auth['id']]);if(!$row)throw new ApiException(403,'هذا الطلب غير مسند إليك','REQUEST_NOT_ASSIGNED');}
}
