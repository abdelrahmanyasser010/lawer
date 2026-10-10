<?php
namespace App\Services;

use App\Exceptions\ApiException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

final class PaymentGatewayService
{
    public function __construct(
        private TemplateEngineService $engine,
        private ConsultationScheduleService $schedule,
        private ServiceRequestWorkflow $workflow,
        private NotificationService $notifications,
        private AuditService $audit,
        private SelfServiceLawyerReviewService $lawyerReview,
    ) {}

    public function createCheckout(Request $request, array $auth, ?int $contractId, ?int $serviceRequestId, ?string $provider = null, array $options = []): array
    {
        if ((bool)$contractId === (bool)$serviceRequestId) throw new ApiException(422,'حدد عقدًا واحدًا أو طلب خدمة واحدًا للدفع','PAYMENT_TARGET_REQUIRED');
        $provider=$this->provider($provider);
        if($contractId)$this->applyContractCheckoutOptions($contractId,(int)$auth['id'],$options);
        $target=$this->target($auth,$contractId,$serviceRequestId);
        $idempotency=hash('sha256',$provider.'|'.$auth['id'].'|'.($contractId?'contract:'.$contractId:'service_request:'.$serviceRequestId).'|'.number_format($target['amountEgp'],2,'.','').'|'.$target['paymentStage']);

        $attempt=DB::transaction(function()use($request,$auth,$target,$provider,$contractId,$serviceRequestId,$idempotency){
            $this->cancelSupersededAttempts($provider,(int)$auth['id'],$contractId,$serviceRequestId,$idempotency);
            $existing=DB::selectOne("SELECT * FROM payment_attempts WHERE idempotency_key=? ORDER BY id DESC LIMIT 1 FOR UPDATE",[$idempotency]);
            if($existing){
                if(in_array((string)$existing->status,['failed','cancelled','expired'],true)){
                    DB::table('payment_attempts')->where('id',$existing->id)->update(['status'=>'created','checkout_url'=>null,'provider_intention_id'=>null,'provider_order_id'=>null,'provider_transaction_id'=>null,'payment_id'=>null,'request_payload_json'=>DB::raw("'{}'::jsonb"),'response_payload_json'=>DB::raw("'{}'::jsonb"),'webhook_payload_json'=>DB::raw("'{}'::jsonb"),'failed_at'=>null,'updated_at'=>now()]);
                    return DB::selectOne('SELECT * FROM payment_attempts WHERE id=?',[$existing->id]);
                }
                return $existing;
            }
            $ref='GAT-'.now()->year.'-'.strtoupper(substr(bin2hex(random_bytes(6)),0,12));
            $metadata=['targetType'=>$contractId?'contract':'service_request','targetId'=>$contractId?:$serviceRequestId,'paymentStage'=>$target['paymentStage'],'title'=>$target['title']];
            $row=DB::selectOne("INSERT INTO payment_attempts(attempt_reference,idempotency_key,user_id,contract_id,service_request_id,provider,amount_egp,currency,status,metadata_json) VALUES (?,?,?,?,?,?,?,?,'created',?::jsonb) RETURNING *",[$ref,$idempotency,$auth['id'],$contractId,$serviceRequestId,$provider,$target['amountEgp'],$this->currency(),json_encode($metadata,JSON_UNESCAPED_UNICODE)]);
            if($contractId){
                DB::statement("UPDATE contracts SET status='pending_payment',submitted_at=COALESCE(submitted_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='draft'",[$contractId]);
                DB::statement("UPDATE contract_versions SET status='internal_review' WHERE id=(SELECT current_version_id FROM contracts WHERE id=?) AND status='draft'",[$contractId]);
            }
            $this->audit->write($request,'payment_gateway.attempt_created','payment_attempt',(int)$row->id,null,['provider'=>$provider,'amountEgp'=>$target['amountEgp'],'target'=>$metadata]);
            return $row;
        });

        if($attempt->checkout_url)return $this->attemptPayload($attempt);

        try{
            $created=$provider==='paymob'?$this->createPaymob($attempt,$target):$this->createKashier($attempt,$target);
            DB::statement('UPDATE payment_attempts SET status=\'pending\',checkout_url=?,provider_intention_id=?,provider_order_id=?,request_payload_json=?::jsonb,response_payload_json=?::jsonb,updated_at=CURRENT_TIMESTAMP WHERE id=?',[
                $created['checkoutUrl'],$created['providerIntentionId']??null,$created['providerOrderId']??null,
                json_encode($created['requestPayload'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
                json_encode($created['responsePayload'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
                $attempt->id,
            ]);
        }catch(ApiException $e){
            DB::table('payment_attempts')->where('id',$attempt->id)->update(['status'=>'failed','failed_at'=>now(),'metadata_json'=>DB::raw("metadata_json || ".DB::getPdo()->quote(json_encode(['errorCode'=>$e->errorCode],JSON_UNESCAPED_UNICODE))."::jsonb"),'updated_at'=>now()]);
            throw $e;
        }catch(\Throwable $e){
            DB::table('payment_attempts')->where('id',$attempt->id)->update(['status'=>'failed','failed_at'=>now(),'metadata_json'=>DB::raw("metadata_json || ".DB::getPdo()->quote(json_encode(['errorMessage'=>mb_substr($e->getMessage(),0,500)],JSON_UNESCAPED_UNICODE))."::jsonb"),'updated_at'=>now()]);
            throw new ApiException(502,'تعذر إنشاء جلسة الدفع لدى بوابة الدفع','PAYMENT_GATEWAY_PROVIDER_FAILED',['provider'=>$provider,'error'=>$e->getMessage()]);
        }

        $fresh=DB::selectOne('SELECT * FROM payment_attempts WHERE id=?',[$attempt->id]);
        return $this->attemptPayload($fresh);
    }

    public function handleWebhook(Request $request, string $provider): array
    {
        $provider=$this->provider($provider);
        $payload=$request->json()->all() ?: $request->all();
        $normalized=$provider==='paymob'?$this->normalizePaymobWebhook($request,$payload):$this->normalizeKashierWebhook($request,$payload);
        $attempt=$this->findAttempt($provider,$normalized);
        if(!$attempt)throw new ApiException(404,'محاولة الدفع غير معروفة','PAYMENT_ATTEMPT_NOT_FOUND');
        if($normalized['success'])$this->assertFinancialMatch($attempt,$normalized);
        if(!$normalized['success']){
            DB::table('payment_attempts')->where('id',$attempt->id)->whereNotIn('status',['paid'])->update(['status'=>'failed','provider_transaction_id'=>$normalized['transactionId'],'webhook_payload_json'=>json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),'failed_at'=>now(),'updated_at'=>now()]);
            return ['attemptReference'=>$attempt->attempt_reference,'status'=>'failed'];
        }
        return $this->settle($request,$attempt,$normalized,$payload);
    }

    public function attemptStatus(array $auth, int $id): array
    {
        $attempt=DB::selectOne('SELECT * FROM payment_attempts WHERE id=? AND user_id=?',[$id,(int)$auth['id']]);
        if(!$attempt)throw new ApiException(404,'محاولة الدفع غير موجودة','PAYMENT_ATTEMPT_NOT_FOUND');
        return $this->attemptPayload($attempt);
    }

    private function target(array $auth, ?int $contractId, ?int $serviceRequestId): array
    {
        $uid=(int)$auth['id'];
        if($contractId){
            $c=DB::selectOne('SELECT c.*,tv.definition_json AS template_definition,u.name AS client_name,u.email AS client_email,u.phone AS client_phone FROM contracts c JOIN template_versions tv ON tv.id=c.template_version_id JOIN users u ON u.id=COALESCE(c.client_user_id,c.user_id) WHERE c.id=? AND c.deleted_at IS NULL AND (c.user_id=? OR c.client_user_id=?) FOR UPDATE',[$contractId,$uid,$uid]);
            if(!$c)throw new ApiException(403,'العقد غير تابع لحسابك');
            if(!in_array($c->status,['draft','pending_payment'],true))throw new ApiException(409,'لا يمكن بدء دفع لهذا العقد في حالته الحالية','PAYMENT_NOT_ALLOWED');
            if($c->status==='draft'){
                $validation=$this->engine->validateDraft($this->json($c->template_definition),(string)$c->variant_key,$this->jsonList($c->selected_optional_clause_keys),$this->json($c->field_values_json),$this->json($c->attachment_refs_json));
                if($validation['issues'])throw new ApiException(422,'أكمل بيانات العقد المطلوبة قبل الدفع','DRAFT_INCOMPLETE',$validation['issues']);
            }
            $expected=(float)$c->original_price_egp+((bool)($c->lawyer_review_add_on_selected??false)?(float)($c->lawyer_review_add_on_price_egp??0):0);
            if($expected<=0)throw new ApiException(409,'هذا العقد لا يحتاج دفعًا حاليًا','PAYMENT_NOT_REQUIRED');
            return ['amountEgp'=>$expected,'paymentStage'=>'full','title'=>$c->title?:$c->serial_number,'customer'=>$this->customer($c->client_name,$c->client_email,$c->client_phone),'returnUrl'=>$this->targetReturnUrl('contract',(int)$contractId)];
        }
        $sr=DB::selectOne('SELECT sr.*,u.name AS client_name,u.email AS client_email,u.phone AS client_phone FROM service_requests sr JOIN users u ON u.id=sr.client_user_id WHERE sr.id=? AND sr.client_user_id=? FOR UPDATE',[$serviceRequestId,$uid]);
        if(!$sr)throw new ApiException(403,'طلب الخدمة غير تابع لحسابك');
        if($sr->status!=='awaiting_payment')throw new ApiException(409,'لا يمكن بدء دفع لهذا الطلب في حالته الحالية','PAYMENT_NOT_ALLOWED');
        $meta=$this->json($sr->metadata_json);
        if($this->workflow->supportsBooking((string)$sr->request_type)&&($meta['paymentStage']??'')!=='balance')$this->schedule->assertPaymentHoldActive((int)$serviceRequestId);
        $expected=(float)($meta['expectedPaymentEgp']??0);
        if($expected<=0)throw new ApiException(409,'هذا الطلب لا يحتاج دفعًا أو لا يوجد مبلغ مثبت له','SERVICE_PAYMENT_NOT_REQUIRED');
        return ['amountEgp'=>$expected,'paymentStage'=>(string)($meta['paymentStage']??'deposit'),'title'=>$sr->title?:$sr->serial_number,'customer'=>$this->customer($sr->client_name,$sr->client_email,$sr->client_phone),'returnUrl'=>$this->targetReturnUrl('service_request',(int)$serviceRequestId)];
    }

    private function createPaymob(object $attempt, array $target): array
    {
        $cfg=config('zdraft.payment_gateway.paymob');$required=['secret_key','public_key','hmac_secret'];foreach($required as$key)if(empty($cfg[$key]))throw new ApiException(503,"إعداد Paymob ناقص: {$key}",'PAYMOB_NOT_CONFIGURED');
        $methods=array_map(fn($v)=>is_numeric($v)?(int)$v:$v,(array)($cfg['integration_ids']??[]));if(!$methods)throw new ApiException(503,'إعداد Paymob ناقص: PAYMOB_INTEGRATION_IDS','PAYMOB_NOT_CONFIGURED');
        $amount=(int)round(((float)$attempt->amount_egp)*100);
        $payload=['amount'=>$amount,'currency'=>$attempt->currency,'payment_methods'=>$methods,'items'=>[['name'=>$target['title'],'amount'=>$amount,'description'=>'Z Draft payment '.$attempt->attempt_reference,'quantity'=>1]],'billing_data'=>$this->paymobBilling($target['customer']),'extras'=>['attemptReference'=>$attempt->attempt_reference],'special_reference'=>$attempt->attempt_reference,'expiration'=>(int)($cfg['expiration_seconds']??3600),'notification_url'=>$this->webhookUrl('paymob'),'redirection_url'=>$target['returnUrl']??$this->returnUrl()];
        $response=Http::timeout(20)->acceptJson()->withHeaders(['Authorization'=>'Token '.$cfg['secret_key']])->post(rtrim((string)$cfg['base_url'],'/').'/v1/intention/',$payload);
        if(!$response->successful())throw new ApiException(502,'تعذر إنشاء نية الدفع من Paymob','PAYMOB_CREATE_INTENTION_FAILED',['status'=>$response->status(),'body'=>$response->json()??$response->body()]);
        $body=$response->json()?:[];$clientSecret=(string)($body['client_secret']??'');if($clientSecret==='')throw new ApiException(502,'رد Paymob لا يحتوي client_secret','PAYMOB_CLIENT_SECRET_MISSING',$body);
        $checkout=rtrim((string)$cfg['base_url'],'/').'/unifiedcheckout/?publicKey='.rawurlencode((string)$cfg['public_key']).'&clientSecret='.rawurlencode($clientSecret);
        return ['checkoutUrl'=>$checkout,'providerIntentionId'=>$body['id']??null,'providerOrderId'=>$body['intention_order_id']??null,'requestPayload'=>$payload,'responsePayload'=>$body];
    }

    private function createKashier(object $attempt, array $target): array
    {
        $cfg=config('zdraft.payment_gateway.kashier');foreach(['secret_key','payment_api_key','merchant_id'] as$key)if(empty($cfg[$key]))throw new ApiException(503,"إعداد Kashier ناقص: {$key}",'KASHIER_NOT_CONFIGURED');
        $payload=['amount'=>number_format((float)$attempt->amount_egp,2,'.',''),'currency'=>$attempt->currency,'order'=>$attempt->attempt_reference,'merchantRedirect'=>$target['returnUrl']??$this->returnUrl(),'type'=>'one-time','allowedMethods'=>(string)$cfg['allowed_methods'],'merchantId'=>(string)$cfg['merchant_id'],'serverWebhook'=>$this->webhookUrl('kashier')];
        $headers=['Authorization'=>(string)$cfg['secret_key'],'api-key'=>(string)$cfg['payment_api_key']];if(!empty($cfg['auth_merchant_id']))$headers['authmerchantid']=(string)$cfg['auth_merchant_id'];
        $response=Http::timeout(20)->acceptJson()->withHeaders($headers)->post(rtrim((string)$cfg['base_url'],'/').'/v3/payment/sessions',$payload);
        if(!$response->successful())throw new ApiException(502,'تعذر إنشاء جلسة الدفع من Kashier','KASHIER_CREATE_SESSION_FAILED',['status'=>$response->status(),'body'=>$response->json()??$response->body()]);
        $body=$response->json()?:[];$checkout=$this->firstString($body,['checkoutUrl','redirectUrl','paymentUrl','url','sessionUrl'],['data'=>['checkoutUrl','redirectUrl','paymentUrl','url','sessionUrl']]);
        if(!$checkout)throw new ApiException(502,'رد Kashier لا يحتوي رابط checkout معروف','KASHIER_CHECKOUT_URL_MISSING',$body);
        return ['checkoutUrl'=>$checkout,'providerIntentionId'=>$body['id']??($body['sessionId']??($body['data']['id']??null)),'providerOrderId'=>$attempt->attempt_reference,'requestPayload'=>$payload,'responsePayload'=>$body];
    }

    private function normalizeKashierWebhook(Request $request,array $payload): array
    {
        $cfg=config('zdraft.payment_gateway.kashier');if(empty($cfg['payment_api_key']))throw new ApiException(503,'إعداد Kashier payment API key ناقص','KASHIER_NOT_CONFIGURED');
        $data=$payload['data']??[];if(!is_array($data))throw new ApiException(400,'Kashier webhook payload غير صالح','KASHIER_WEBHOOK_INVALID');
        $keys=$data['signatureKeys']??[];if(!is_array($keys)||!$keys)throw new ApiException(400,'Kashier webhook لا يحتوي signatureKeys','KASHIER_SIGNATURE_KEYS_MISSING');
        sort($keys,SORT_STRING);$parts=[];foreach($keys as$key)$parts[]=$key.'='.rawurlencode((string)($data[$key]??''));
        $expected=hash_hmac('sha256',implode('&',$parts),(string)$cfg['payment_api_key']);
        $actual=(string)$request->header('x-kashier-signature','');
        if($actual===''||!hash_equals(strtolower($expected),strtolower($actual)))throw new ApiException(401,'توقيع Kashier غير صحيح','KASHIER_SIGNATURE_INVALID');
        return [
            'reference'=>(string)($data['merchantOrderId']??$data['orderReference']??''),
            'orderId'=>(string)($data['kashierOrderId']??''),
            'transactionId'=>(string)($data['transactionId']??''),
            'success'=>(string)($data['status']??'')==='SUCCESS'&&((string)($data['transactionResponseCode']??'')==='00'),
            'amountEgp'=>isset($data['amount'])?(float)$data['amount']:null,
            'currency'=>isset($data['currency'])?strtoupper((string)$data['currency']):null,
            'merchantId'=>isset($data['merchantId'])?(string)$data['merchantId']:null,
        ];
    }

    private function normalizePaymobWebhook(Request $request,array $payload): array
    {
        $cfg=config('zdraft.payment_gateway.paymob');if(empty($cfg['hmac_secret']))throw new ApiException(503,'إعداد Paymob HMAC secret ناقص','PAYMOB_NOT_CONFIGURED');
        $data=is_array($payload['obj']??null)?$payload['obj']:$payload;
        $actual=(string)($request->query('hmac')??$payload['hmac']??'');if($actual==='')throw new ApiException(401,'Paymob callback لا يحتوي HMAC','PAYMOB_HMAC_MISSING');
        $keys=['amount_cents','created_at','currency','error_occured','has_parent_transaction','id','integration_id','is_3d_secure','is_auth','is_capture','is_refunded','is_standalone_payment','is_voided','order','owner','pending','source_data_pan','source_data_sub_type','source_data_type','success'];
        $raw='';foreach($keys as$key)$raw.=$this->paymobValue($data,$key);
        $expected=hash_hmac('sha512',$raw,(string)$cfg['hmac_secret']);
        if(!hash_equals(strtolower($expected),strtolower($actual)))throw new ApiException(401,'توقيع Paymob غير صحيح','PAYMOB_HMAC_INVALID');
        $order=$data['order']??null;$orderId=is_array($order)?(string)($order['id']??''):(string)($order??'');
        return [
            'reference'=>(string)($data['merchant_order_id']??$data['special_reference']??($data['payment_key_claims']['extra']['attemptReference']??'')),
            'orderId'=>$orderId,
            'transactionId'=>(string)($data['id']??''),
            'success'=>filter_var($data['success']??false,FILTER_VALIDATE_BOOL)&&!filter_var($data['pending']??false,FILTER_VALIDATE_BOOL),
            'amountEgp'=>isset($data['amount_cents'])?((float)$data['amount_cents']/100):null,
            'currency'=>isset($data['currency'])?strtoupper((string)$data['currency']):null,
            'integrationId'=>isset($data['integration_id'])?(string)$data['integration_id']:null,
        ];
    }

    private function settle(Request $request,object $attempt,array $normalized,array $payload): array
    {
        return DB::transaction(function()use($request,$attempt,$normalized,$payload){
            $locked=DB::selectOne('SELECT * FROM payment_attempts WHERE id=? FOR UPDATE',[$attempt->id]);if(!$locked)throw new ApiException(404,'محاولة الدفع غير موجودة','PAYMENT_ATTEMPT_NOT_FOUND');
            if($locked->status==='paid')return ['attemptReference'=>$locked->attempt_reference,'status'=>'paid','paymentId'=>$locked->payment_id];
            if(in_array((string)$locked->status,['cancelled','expired','failed'],true))throw new ApiException(409,'محاولة الدفع لم تعد نشطة','PAYMENT_ATTEMPT_NOT_ACTIVE',['status'=>$locked->status]);
            $serial='PAY-'.now()->year.'-'.strtoupper(substr(bin2hex(random_bytes(5)),0,8));$meta=$this->json($locked->metadata_json);$stage=(string)($meta['paymentStage']??'gateway');
            $row=DB::selectOne("INSERT INTO payments(serial_number,user_id,contract_id,service_request_id,amount_egp,payment_method,status,reviewed_at,source,payment_stage,provider,provider_reference,transaction_reference) VALUES (?,?,?,?,?,?,'approved',CURRENT_TIMESTAMP,'gateway',?,?,?,?) RETURNING id",[$serial,$locked->user_id,$locked->contract_id,$locked->service_request_id,$locked->amount_egp,$locked->provider.'_gateway',$stage,$locked->provider,$normalized['transactionId']?:$normalized['orderId']?:$locked->attempt_reference,$normalized['orderId']?:null]);
            $paymentId=(int)$row->id;
            if($locked->contract_id)$this->settleContract((int)$locked->contract_id,(int)$locked->user_id);
            if($locked->service_request_id)$this->settleServiceRequest((int)$locked->service_request_id,(float)$locked->amount_egp);
            DB::statement('UPDATE payment_attempts SET status=\'paid\',payment_id=?,provider_transaction_id=?,provider_order_id=COALESCE(provider_order_id,?),webhook_payload_json=?::jsonb,verified_at=CURRENT_TIMESTAMP,settled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?',[$paymentId,$normalized['transactionId']?:null,$normalized['orderId']?:null,json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$locked->id]);
            $this->notifications->notify((int)$locked->user_id,'payment_approved','تم اعتماد الدفع','تم تأكيد عملية الدفع إلكترونيًا ويمكنك متابعة الخطوة التالية من حسابك',$locked->contract_id?"/contract/{$locked->contract_id}":"/requests/{$locked->service_request_id}",[],'important');
            $this->audit->write($request,'payment_gateway.settled','payment_attempt',(int)$locked->id,null,['paymentId'=>$paymentId,'provider'=>$locked->provider,'transactionId'=>$normalized['transactionId']?:null,'orderId'=>$normalized['orderId']?:null]);
            return ['attemptReference'=>$locked->attempt_reference,'status'=>'paid','paymentId'=>$paymentId];
        });
    }

    private function settleContract(int $contractId,int $userId): void
    {
        $contract=DB::selectOne('SELECT id,status,creation_mode,current_version_id FROM contracts WHERE id=? AND deleted_at IS NULL FOR UPDATE',[$contractId]);
        if(!$contract||$contract->status!=='pending_payment')throw new ApiException(409,'حالة العقد تغيّرت قبل تأكيد الدفع','PAYMENT_TARGET_STATE_CHANGED',['target'=>'contract','status'=>$contract->status??null]);
        if($contract->creation_mode==='self_service'){
            $policy=DB::selectOne("SELECT LEAST(168,GREATEST(1,COALESCE((setting_value_json #>> '{}')::int,24))) AS edit_hours FROM platform_settings WHERE setting_key='contracts.self_service_edit_hours'");$editHours=(int)($policy->edit_hours??24);
            DB::statement("UPDATE contracts SET status='client_review',core_identity_locked=TRUE,edit_window_started_at=CURRENT_TIMESTAMP,edit_expires_at=CURRENT_TIMESTAMP + (?::text || ' hours')::interval,updated_at=CURRENT_TIMESTAMP WHERE id=?",[$editHours,$contractId]);
            if($contract->current_version_id)DB::table('contract_versions')->where('id',$contract->current_version_id)->update(['status'=>'client_review']);
            $this->lawyerReview->activateAfterSettledPayment($contractId,$userId);
        }else DB::statement("UPDATE contracts SET status='pending_review',updated_at=CURRENT_TIMESTAMP WHERE id=?",[$contractId]);
    }

    private function settleServiceRequest(int $serviceRequestId,float $amount): void
    {
        $sr=DB::selectOne('SELECT id,request_type,status,metadata_json FROM service_requests WHERE id=? FOR UPDATE',[$serviceRequestId]);
        if(!$sr||$sr->status!=='awaiting_payment')throw new ApiException(409,'حالة طلب الخدمة تغيّرت قبل تأكيد الدفع','PAYMENT_TARGET_STATE_CHANGED',['target'=>'service_request','status'=>$sr->status??null]);
        $paidRow=DB::selectOne("SELECT COALESCE(SUM(amount_egp) FILTER (WHERE status='approved'),0)::float AS amount FROM payments WHERE service_request_id=?",[$serviceRequestId]);
        $state=$this->servicePaymentState($sr,$serviceRequestId,(float)($paidRow->amount??0));
        DB::statement('UPDATE service_requests SET status=?,metadata_json=?::jsonb,completed_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?',[$state['status'],json_encode($state['meta'],JSON_UNESCAPED_UNICODE),$serviceRequestId]);
        if($this->workflow->supportsBooking((string)$sr->request_type)&&($state['previousStage']??'')!=='balance')$this->schedule->setBookingStatus($serviceRequestId,'confirmed');
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

    private function findAttempt(string $provider,array $normalized): ?object
    {
        $reference=$normalized['reference']?:null;$order=$normalized['orderId']?:null;$tx=$normalized['transactionId']?:null;
        return DB::selectOne("SELECT * FROM payment_attempts WHERE provider=? AND ((?::text IS NOT NULL AND attempt_reference=?) OR (?::text IS NOT NULL AND provider_order_id=?) OR (?::text IS NOT NULL AND provider_transaction_id=?)) ORDER BY id DESC LIMIT 1",[$provider,$reference,$reference,$order,$order,$tx,$tx]);
    }

    private function provider(?string $provider): string
    {
        $provider=strtolower(trim((string)($provider?:config('zdraft.payment_gateway.provider'))));
        if(!in_array($provider,['paymob','kashier'],true))throw new ApiException(503,'بوابة الدفع غير محددة. اختر paymob أو kashier في الإعدادات','PAYMENT_GATEWAY_NOT_CONFIGURED');
        return $provider;
    }

    private function cancelSupersededAttempts(string $provider,int $userId,?int $contractId,?int $serviceRequestId,string $currentIdempotency): void
    {
        $query=DB::table('payment_attempts')
            ->where('provider',$provider)
            ->where('user_id',$userId)
            ->whereIn('status',['created','pending'])
            ->where('idempotency_key','<>',$currentIdempotency);
        if($contractId){
            $query->where('contract_id',$contractId)->whereNull('service_request_id');
        }else{
            $query->where('service_request_id',$serviceRequestId)->whereNull('contract_id');
        }
        $query->update(['status'=>'cancelled','checkout_url'=>null,'updated_at'=>now()]);
    }

    private function attemptPayload(object $attempt): array
    {
        $status=(string)$attempt->status;
        $reference=$attempt->provider_transaction_id?:($attempt->provider_order_id?:$attempt->attempt_reference);
        return [
            'id'=>(int)$attempt->id,
            'paymentAttemptId'=>(int)$attempt->id,
            'attemptReference'=>(string)$attempt->attempt_reference,
            'provider'=>(string)$attempt->provider,
            'status'=>$status,
            'amountEgp'=>(float)$attempt->amount_egp,
            'currency'=>(string)$attempt->currency,
            'checkoutUrl'=>$attempt->checkout_url,
            'redirectUrl'=>$attempt->checkout_url,
            'redirectRequired'=>$status==='pending'&&$attempt->checkout_url!==null,
            'transactionReference'=>$reference,
            'contractId'=>$attempt->contract_id?(int)$attempt->contract_id:null,
            'serviceRequestId'=>$attempt->service_request_id?(int)$attempt->service_request_id:null,
            'paymentId'=>$attempt->payment_id?(int)$attempt->payment_id:null,
        ];
    }
    private function currency(): string{return strtoupper((string)config('zdraft.payment_gateway.currency','EGP'));}
    private function returnUrl(): string{return (string)config('zdraft.payment_gateway.return_url');}
    private function targetReturnUrl(string $targetType,int $id): string
    {
        $base=rtrim((string)config('zdraft.frontend_url','http://localhost:3000'),'/');
        return $targetType==='contract'?"{$base}/contract/{$id}?payment=return":"{$base}/requests/{$id}?payment=return";
    }
    private function webhookUrl(string $provider): string{return str_replace('{provider}',$provider,(string)config('zdraft.payment_gateway.webhook_url'));}
    private function customer(?string $name,?string $email,?string $phone): array{return ['name'=>trim((string)$name)?:'Z Draft Customer','email'=>trim((string)$email)?:'customer@example.test','phone'=>trim((string)$phone)?:'+201000000000'];}
    private function paymobBilling(array $c): array{$parts=preg_split('/\s+/u',$c['name'],2);return ['apartment'=>'NA','first_name'=>$parts[0]?:'Z','last_name'=>$parts[1]??'Draft','street'=>'NA','building'=>'NA','phone_number'=>$c['phone'],'city'=>'Cairo','country'=>'EG','email'=>$c['email'],'floor'=>'NA','state'=>'Cairo'];}
    private function paymobValue(array $data,string $key): string{$value=$data[$key]??'';if($key==='order'&&is_array($value))$value=$value['id']??'';if(str_starts_with($key,'source_data_')){$source=$data['source_data']??[];$sub=substr($key,12);$value=is_array($source)?($source[$sub]??''):$value;}if(is_bool($value))return $value?'true':'false';if($value===null)return '';return (string)$value;}
    private function firstString(array $body,array $keys,array $nested=[]): ?string{foreach($keys as$key){$v=$body[$key]??null;if(is_string($v)&&$v!=='')return$v;}foreach($nested as$root=>$childKeys){$node=$body[$root]??null;if(is_array($node)){foreach($childKeys as$key){$v=$node[$key]??null;if(is_string($v)&&$v!=='')return$v;}}}return null;}
    private function json(mixed$value):array{if(is_array($value))return$value;if(is_object($value))return(array)$value;if(is_string($value)){$decoded=json_decode($value,true);return is_array($decoded)?$decoded:[];}return[];}
    private function jsonList(mixed$value):array{return array_values(array_map('strval',$this->json($value)));}
    private function applyContractCheckoutOptions(int $contractId,int $userId,array $options): void
    {
        $purpose=trim((string)($options['purpose']??''));
        $metadata=is_array($options['metadata']??null)?$options['metadata']:[];
        $hasFlag=array_key_exists('lawyerReviewEnabled',$metadata);
        $semanticOn=$purpose==='self_service_with_lawyer_review';
        if(!$hasFlag&&!$semanticOn)return;
        $enabled=$semanticOn||filter_var($metadata['lawyerReviewEnabled']??false,FILTER_VALIDATE_BOOL);
        if($enabled)$this->lawyerReview->selectForCheckout($contractId,$userId,isset($metadata['lawyerReviewNote'])?(string)$metadata['lawyerReviewNote']:null);
        else $this->lawyerReview->clearSelectionForCheckout($contractId,$userId);
    }
    private function assertFinancialMatch(object $attempt,array $normalized): void
    {
        if(isset($normalized['amountEgp'])&&$normalized['amountEgp']!==null&&abs((float)$normalized['amountEgp']-(float)$attempt->amount_egp)>0.009){
            throw new ApiException(409,'قيمة الدفع المؤكدة من بوابة الدفع لا تطابق محاولة الدفع','PAYMENT_WEBHOOK_AMOUNT_MISMATCH',['expectedAmountEgp'=>(float)$attempt->amount_egp,'providerAmountEgp'=>(float)$normalized['amountEgp']]);
        }
        if(!empty($normalized['currency'])&&strtoupper((string)$normalized['currency'])!==strtoupper((string)$attempt->currency)){
            throw new ApiException(409,'عملة الدفع المؤكدة من بوابة الدفع لا تطابق محاولة الدفع','PAYMENT_WEBHOOK_CURRENCY_MISMATCH',['expectedCurrency'=>$attempt->currency,'providerCurrency'=>$normalized['currency']]);
        }
        if((string)$attempt->provider==='paymob'&&!empty($normalized['integrationId'])){
            $allowed=array_map('strval',(array)config('zdraft.payment_gateway.paymob.integration_ids',[]));
            if($allowed&&!in_array((string)$normalized['integrationId'],$allowed,true))throw new ApiException(409,'Paymob integration غير مطابق لإعدادات المنصة','PAYMOB_INTEGRATION_MISMATCH');
        }
        if((string)$attempt->provider==='kashier'&&!empty($normalized['merchantId'])){
            $merchant=(string)config('zdraft.payment_gateway.kashier.merchant_id','');
            if($merchant!==''&&(string)$normalized['merchantId']!==$merchant)throw new ApiException(409,'Kashier merchant غير مطابق لإعدادات المنصة','KASHIER_MERCHANT_MISMATCH');
        }
    }
}
