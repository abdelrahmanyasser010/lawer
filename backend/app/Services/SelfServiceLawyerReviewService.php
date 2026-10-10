<?php

namespace App\Services;

use App\Exceptions\ApiException;
use Illuminate\Support\Facades\DB;

final class SelfServiceLawyerReviewService
{
    public function __construct(private ContractPricingService $pricing) {}

    /** @return array{enabled:bool,priceEgp:float} */
    public function availability(object $contract): array
    {
        if ((string) $contract->creation_mode !== 'self_service') return ['enabled'=>false,'priceEgp'=>0.0];
        $definition = $this->json($contract->template_definition ?? []);
        $variant = collect($definition['variants'] ?? [])->firstWhere('key', (string) $contract->variant_key);
        if (!$variant || ($variant['lawyerReviewAddOn']['enabled'] ?? true) === false) return ['enabled'=>false,'priceEgp'=>0.0];
        $globalEnabled = $this->settingBool('services.self_service_lawyer_review.enabled');
        $price = $this->pricing->lawyerReviewPrice((string) $contract->template_slug, (string) $contract->variant_key, $definition);
        if ($price <= 0) $price = $this->settingAmount('services.self_service_lawyer_review.fee_egp');
        return ['enabled'=>$globalEnabled && $price > 0,'priceEgp'=>max(0.0,$price)];
    }

    /** @return array{priceEgp:float,status:string} */
    public function selectForCheckout(int $contractId,int $userId,?string $note): array
    {
        $contract=DB::selectOne(<<<'SQL'
SELECT c.*,ct.slug AS template_slug,tv.definition_json AS template_definition
FROM contracts c
JOIN contract_templates ct ON ct.id=c.template_id
JOIN template_versions tv ON tv.id=c.template_version_id
WHERE c.id=? AND c.deleted_at IS NULL AND (c.user_id=? OR c.client_user_id=?)
FOR UPDATE
SQL,[$contractId,$userId,$userId]);
        if(!$contract)throw new ApiException(403,'العقد غير تابع لحسابك');
        if(!in_array((string)$contract->status,['draft','pending_payment'],true))throw new ApiException(409,'لا يمكن تغيير اختيار مراجعة المحامي بعد بدء تنفيذ العقد','LAWYER_REVIEW_SELECTION_LOCKED');
        $availability=$this->availability($contract);
        if(!$availability['enabled'])throw new ApiException(409,'مراجعة المحامي غير متاحة لهذا النوع من العقود حاليًا','LAWYER_REVIEW_ADD_ON_UNAVAILABLE');
        DB::table('contracts')->where('id',$contractId)->update([
            'lawyer_review_add_on_selected'=>true,
            'lawyer_review_add_on_price_egp'=>$availability['priceEgp'],
            'lawyer_review_add_on_status'=>'awaiting_payment',
            'lawyer_review_add_on_note'=>$this->note($note),
            'lawyer_review_selected_at'=>now(),
            'updated_at'=>now(),
        ]);
        return ['priceEgp'=>$availability['priceEgp'],'status'=>'awaiting_payment'];
    }

    public function clearSelectionForCheckout(int $contractId,int $userId): void
    {
        $contract=DB::selectOne('SELECT id,status,lawyer_review_service_request_id FROM contracts WHERE id=? AND deleted_at IS NULL AND (user_id=? OR client_user_id=?) FOR UPDATE',[$contractId,$userId,$userId]);
        if(!$contract)throw new ApiException(403,'العقد غير تابع لحسابك');
        if($contract->lawyer_review_service_request_id)throw new ApiException(409,'بدأت مراجعة المحامي ولا يمكن إلغاء الإضافة من شاشة الدفع','LAWYER_REVIEW_ALREADY_STARTED');
        if(!in_array((string)$contract->status,['draft','pending_payment'],true))throw new ApiException(409,'لا يمكن تغيير اختيار مراجعة المحامي بعد بدء تنفيذ العقد','LAWYER_REVIEW_SELECTION_LOCKED');
        DB::table('contracts')->where('id',$contractId)->update([
            'lawyer_review_add_on_selected'=>false,'lawyer_review_add_on_price_egp'=>0,
            'lawyer_review_add_on_status'=>null,'lawyer_review_add_on_note'=>null,
            'lawyer_review_selected_at'=>null,'updated_at'=>now(),
        ]);
    }

    public function activateAfterSettledPayment(int $contractId,int $actorUserId): ?int
    {
        $contract=DB::selectOne('SELECT c.*,ct.slug AS template_slug FROM contracts c JOIN contract_templates ct ON ct.id=c.template_id WHERE c.id=? FOR UPDATE',[$contractId]);
        if(!$contract||!(bool)$contract->lawyer_review_add_on_selected)return null;
        if($contract->lawyer_review_service_request_id)return(int)$contract->lawyer_review_service_request_id;
        $clientId=(int)($contract->client_user_id?:$contract->user_id);
        $serial='SSR-'.now()->year.'-'.strtoupper(substr(bin2hex(random_bytes(5)),0,8));
        $metadata=[
            'description'=>'مراجعة محامٍ لعقد تم إنشاؤه ذاتيًا قبل الإصدار النهائي.',
            'customerNote'=>$contract->lawyer_review_add_on_note,
            'templateSlug'=>$contract->template_slug,
            'variantKey'=>$contract->variant_key,
            'serviceTotalPriceEgp'=>(float)$contract->lawyer_review_add_on_price_egp,
            'serviceDepositEgp'=>(float)$contract->lawyer_review_add_on_price_egp,
            'serviceRemainingEgp'=>0.0,'expectedPaymentEgp'=>0.0,'paymentStage'=>'paid',
            'pricingKey'=>'contract_snapshot:lawyer_review_add_on',
        ];
        $request=DB::selectOne("INSERT INTO service_requests(serial_number,request_type,source_channel,client_user_id,title,status,priority,metadata_json,linked_contract_id) VALUES (?,'self_service_lawyer_review','customer',?,?,'new','normal',?::jsonb,?) RETURNING id",[
            $serial,$clientId,'مراجعة محامٍ قبل إصدار '.$contract->title,json_encode($metadata,JSON_UNESCAPED_UNICODE),$contractId,
        ]);
        $requestId=(int)$request->id;
        DB::insert("INSERT INTO service_request_events(service_request_id,actor_user_id,event_type,notes,payload_json,visibility) VALUES (?,?,'request_created','تم استلام طلب مراجعة العقد قبل الإصدار',?::jsonb,'client')",[$requestId,$actorUserId,json_encode(['contractId'=>$contractId,'status'=>'new'],JSON_UNESCAPED_UNICODE)]);
        DB::table('contracts')->where('id',$contractId)->update([
            'lawyer_review_service_request_id'=>$requestId,'lawyer_review_add_on_status'=>'pending_assignment',
            'status'=>'pending_review','core_identity_locked'=>true,'updated_at'=>now(),
        ]);
        DB::table('contract_versions')->where('id',$contract->current_version_id)->whereIn('status',['draft','client_review'])->update(['status'=>'internal_review']);
        return$requestId;
    }

    public function syncFromServiceRequest(int $requestId,string $serviceStatus): void
    {
        $contract=DB::selectOne('SELECT id,current_version_id FROM contracts WHERE lawyer_review_service_request_id=? FOR UPDATE',[$requestId]);
        if(!$contract)return;
        $addOnStatus=match($serviceStatus){'new'=>'pending_assignment','assigned'=>'assigned','in_progress','revision_requested'=>'in_review','client_review','completed'=>'completed','cancelled'=>'cancelled',default=>$serviceStatus};
        $updates=['lawyer_review_add_on_status'=>$addOnStatus,'updated_at'=>now()];
        if($serviceStatus==='completed'){
            $updates['lawyer_review_completed_at']=now();$updates['status']='client_review';
            DB::table('contract_versions')->where('id',$contract->current_version_id)->update(['status'=>'client_review']);
        }
        DB::table('contracts')->where('id',$contract->id)->update($updates);
    }

    public function assertIssuanceAllowed(object $contract): void
    {
        if((bool)($contract->lawyer_review_add_on_selected??false)&&($contract->lawyer_review_add_on_status??null)!=='completed'){
            throw new ApiException(409,'يجب إكمال مراجعة المحامي قبل إصدار العقد','LAWYER_REVIEW_REQUIRED_BEFORE_ISSUANCE');
        }
    }

    public function payload(object $contract): ?array
    {
        if(!(bool)($contract->lawyer_review_add_on_selected??false))return null;
        $status=(string)($contract->lawyer_review_add_on_status??'awaiting_payment');
        return [
            'enabled'=>true,'priceEgp'=>(float)($contract->lawyer_review_add_on_price_egp??0),'status'=>$status,
            'customerFacingStatus'=>match($status){
                'awaiting_payment'=>'بانتظار الدفع لبدء مراجعة المحامي','pending_assignment'=>'بانتظار تعيين المحامي',
                'assigned'=>'تم تعيين المحامي','in_review'=>'العقد عند المحامي للمراجعة',
                'completed'=>'اكتملت مراجعة المحامي والعقد جاهز للإصدار','cancelled'=>'تم إلغاء مراجعة المحامي',
                default=>'مراجعة المحامي قيد المتابعة',
            },
            'customerNote'=>$contract->lawyer_review_add_on_note??null,
            'serviceRequestId'=>$contract->lawyer_review_service_request_id?(int)$contract->lawyer_review_service_request_id:null,
            'issuanceBlocked'=>$status!=='completed',
            'assignedLawyer'=>$contract->lawyer_review_lawyer_id?[
                'displayName'=>$contract->lawyer_review_lawyer_name,'specialization'=>$contract->lawyer_review_lawyer_specialization,'profileImage'=>null,
            ]:null,
        ];
    }

    private function settingAmount(string $key): float{$raw=DB::table('platform_settings')->where('setting_key',$key)->value('setting_value_json');if(is_string($raw))$raw=json_decode($raw,true);return max(0.0,(float)($raw??0));}
    private function settingBool(string $key): bool{$raw=DB::table('platform_settings')->where('setting_key',$key)->value('setting_value_json');if(is_string($raw))$raw=json_decode($raw,true);return(bool)$raw;}
    private function json(mixed $value): array{if(is_array($value))return$value;if(is_object($value))return(array)$value;if(is_string($value))return json_decode($value,true)?:[];return[];}
    private function note(?string $note): ?string{$note=trim((string)$note);if(mb_strlen($note)>5000)throw new ApiException(422,'ملاحظة المراجعة أطول من الحد المسموح','LAWYER_REVIEW_NOTE_TOO_LONG');return$note!==''?$note:null;}
}
