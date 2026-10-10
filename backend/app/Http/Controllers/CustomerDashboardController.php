<?php

namespace App\Http\Controllers;

use App\Services\ContractStateProjector;
use App\Services\ServiceRequestStateProjector;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

final class CustomerDashboardController extends Controller
{
    use ApiResponse;

    public function __construct(
        private ContractStateProjector $contractStates,
        private ServiceRequestStateProjector $serviceStates,
    ) {}

    public function __invoke(Request $request)
    {
        $uid=(int)$request->attributes->get('auth_user')['id'];
        $contracts=DB::select(<<<'SQL'
SELECT c.id,c.serial_number AS "serialNumber",c.title,c.status,c.source_channel AS "sourceChannel",
       c.variant_key AS "variantKey",c.updated_at AS "updatedAt",c.original_price_egp::float AS "priceEgp",
       c.pdf_status AS "pdfStatus",c.edit_expires_at AS "editExpiresAt",ct.slug AS "templateSlug",ct.name_ar AS "templateNameAr",
       latest.status AS "latestPaymentStatus",COALESCE(paid.amount,0)::float AS "approvedPaidEgp",
       c.lawyer_review_add_on_selected AS "lawyerReviewSelected",
       c.lawyer_review_add_on_price_egp::float AS "lawyerReviewPriceEgp",
       c.lawyer_review_add_on_status AS "lawyerReviewStatus"
FROM contracts c
JOIN contract_templates ct ON ct.id=c.template_id
LEFT JOIN LATERAL (SELECT p.status FROM payments p WHERE p.contract_id=c.id ORDER BY p.created_at DESC,p.id DESC LIMIT 1) latest ON TRUE
LEFT JOIN LATERAL (SELECT COALESCE(SUM(p.amount_egp) FILTER (WHERE p.status='approved'),0) AS amount FROM payments p WHERE p.contract_id=c.id) paid ON TRUE
WHERE c.deleted_at IS NULL AND (c.user_id=? OR c.client_user_id=?)
ORDER BY c.updated_at DESC LIMIT 8
SQL,[$uid,$uid]);

        $recentContracts=[];$required=[];$now=time();
        foreach($contracts as$row){
            $lawyerReviewSelected=(bool)$row->lawyerReviewSelected;
            $totalPrice=(float)$row->priceEgp+($lawyerReviewSelected?(float)$row->lawyerReviewPriceEgp:0.0);
            $state=$this->contractStates->project((int)$row->id,(string)$row->status,(string)$row->templateSlug,$row->latestPaymentStatus?(string)$row->latestPaymentStatus:null,$totalPrice,(float)$row->approvedPaidEgp,$row->pdfStatus?(string)$row->pdfStatus:null,$row->editExpiresAt&&strtotime((string)$row->editExpiresAt)>$now,$lawyerReviewSelected,$row->lawyerReviewStatus?(string)$row->lawyerReviewStatus:null);
            $recentContracts[]=array_merge($this->row($row,['latestPaymentStatus','approvedPaidEgp','priceEgp','pdfStatus','editExpiresAt','lawyerReviewSelected','lawyerReviewPriceEgp','lawyerReviewStatus']),$state);
            if($state['requiresCustomerAction']&&$state['nextCustomerAction'])$required[]=['id'=>'contract:'.$row->id,'sourceType'=>'contract','sourceId'=>(int)$row->id,'title'=>(string)($row->title?:$row->templateNameAr),'status'=>$state['customerFacingStatus'],'action'=>$state['nextCustomerAction']];
        }

        $services=DB::select(<<<'SQL'
SELECT sr.id,sr.serial_number AS "serialNumber",sr.request_type AS "requestType",sr.request_purpose AS "requestPurpose",
       sr.contract_type_text AS "contractTypeText",sr.title,sr.status,sr.priority,sr.communication_channel AS "communicationChannel",
       sr.metadata_json AS "projectionMetadata",sr.metadata_json->>'paymentStage' AS "paymentStage",
       sr.created_at AS "createdAt",sr.updated_at AS "updatedAt",latest.status AS "latestPaymentStatus",
       COALESCE(paid.amount,0)::float AS "approvedPaidEgp",booking.status AS "bookingStatus",
       COALESCE(deliverables.count,0)::int AS "deliverablesCount",deliverables.current_type AS "currentDeliverableType",
       COALESCE(deliverables.current_is_final,FALSE) AS "currentDeliverableIsFinal"
FROM service_requests sr
LEFT JOIN LATERAL (SELECT p.status FROM payments p WHERE p.service_request_id=sr.id ORDER BY p.created_at DESC,p.id DESC LIMIT 1) latest ON TRUE
LEFT JOIN LATERAL (SELECT COALESCE(SUM(p.amount_egp) FILTER (WHERE p.status='approved'),0) AS amount FROM payments p WHERE p.service_request_id=sr.id) paid ON TRUE
LEFT JOIN LATERAL (SELECT cb.status FROM consultation_bookings cb WHERE cb.service_request_id=sr.id ORDER BY cb.updated_at DESC,cb.id DESC LIMIT 1) booking ON TRUE
LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS count,(ARRAY_AGG(d.deliverable_type ORDER BY d.published_at DESC,d.id DESC))[1] AS current_type,
           (ARRAY_AGG(d.is_final ORDER BY d.published_at DESC,d.id DESC))[1] AS current_is_final
    FROM service_request_deliverables d WHERE d.service_request_id=sr.id
) deliverables ON TRUE
WHERE sr.client_user_id=?
  AND sr.request_type <> 'self_service_lawyer_review'
ORDER BY sr.updated_at DESC,sr.created_at DESC LIMIT 8
SQL,[$uid]);

        $recentServices=[];
        foreach($services as$row){
            $metadata=$this->json($row->projectionMetadata);
            $state=$this->serviceStates->project((int)$row->id,(string)$row->requestType,(string)$row->status,$metadata,$row->latestPaymentStatus?(string)$row->latestPaymentStatus:null,(float)$row->approvedPaidEgp,(int)$row->deliverablesCount,$row->requestPurpose?(string)$row->requestPurpose:null,$row->bookingStatus?(string)$row->bookingStatus:null,$row->currentDeliverableType?(string)$row->currentDeliverableType:null,(bool)$row->currentDeliverableIsFinal,(string)($metadata['paymentStage']??'')==='balance'&&(bool)$row->currentDeliverableIsFinal);
            $recentServices[]=array_merge($this->row($row,['projectionMetadata','latestPaymentStatus','approvedPaidEgp','bookingStatus','currentDeliverableType','currentDeliverableIsFinal']),$state);
            if($state['requiresCustomerAction']&&$state['nextCustomerAction'])$required[]=['id'=>'service_request:'.$row->id,'sourceType'=>'service_request','sourceId'=>(int)$row->id,'title'=>(string)$row->title,'status'=>$state['customerFacingStatus'],'action'=>$state['nextCustomerAction']];
        }

        return$this->ok($request,['requiredActions'=>$required,'recentContracts'=>$recentContracts,'recentServiceRequests'=>$recentServices]);
    }

    private function row(object $row,array $remove=[]):array{$data=get_object_vars($row);foreach($remove as$key)unset($data[$key]);return$data;}
    private function json(mixed$value):array{if(is_array($value))return$value;if(is_object($value))return(array)$value;if(is_string($value)){$decoded=json_decode($value,true);return is_array($decoded)?$decoded:[];}return[];}
}
