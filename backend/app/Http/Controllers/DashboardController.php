<?php
namespace App\Http\Controllers;
use App\Services\ServiceRequestStateProjector;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
final class DashboardController extends Controller
{
    use ApiResponse;
    public function __construct(private ServiceRequestStateProjector $stateProjector) {}
    private function has(Request $request,string $permission):bool{$u=$request->attributes->get('auth_user');return in_array('super_admin',$u['roles']??[],true)||in_array($permission,$u['permissions']??[],true);}
    public function summary(Request $request)
    {
        $uid=$request->attributes->get('auth_user')['id'];$allContracts=$this->has($request,'contracts.view_all');$allRequests=$this->has($request,'requests.view_all');$payments=$this->has($request,'payments.review')||$this->has($request,'reports.view');
        $contracts=DB::selectOne("SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE status IN ('pending_review','assigned','in_progress','revision_requested'))::int AS active,COUNT(*) FILTER (WHERE status='issued')::int AS issued,COUNT(*) FILTER (WHERE source_channel='office')::int AS office FROM contracts WHERE deleted_at IS NULL AND (?::boolean=TRUE OR assigned_lawyer_id=?)",[$allContracts,$uid]);
        $requests=DB::selectOne("SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE status IN ('new','revision_requested'))::int AS needs_attention,COUNT(*) FILTER (WHERE status='new')::int AS unassigned,COUNT(*) FILTER (WHERE status IN ('awaiting_client_info','client_review'))::int AS awaiting_client,COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM consultation_bookings cb WHERE cb.service_request_id=service_requests.id AND cb.status IN ('confirmed','meeting_scheduled') AND (cb.slot_start AT TIME ZONE 'Africa/Cairo')::date=(CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Cairo')::date))::int AS meetings_today,COUNT(*) FILTER (WHERE due_at<CURRENT_TIMESTAMP AND status NOT IN ('awaiting_payment','completed','cancelled'))::int AS overdue FROM service_requests WHERE (?::boolean=TRUE OR assigned_lawyer_id=?)",[$allRequests,$uid]);
        $paymentData=$payments?DB::selectOne("SELECT COUNT(*) FILTER (WHERE status IN ('pending_verification','needs_client_info'))::int AS pending,COALESCE(SUM(amount_egp) FILTER (WHERE status='approved' AND reviewed_at>=date_trunc('month',CURRENT_TIMESTAMP)),0)::float AS approved_month FROM payments"):(object)['pending'=>0,'approved_month'=>0];
        $notifications=DB::selectOne('SELECT COUNT(*)::int AS unread FROM dashboard_notifications WHERE recipient_user_id=? AND read_at IS NULL',[$uid]);
        return $this->ok($request,['contracts'=>$contracts,'requests'=>$requests,'payments'=>$paymentData,'notifications'=>$notifications]);
    }
    public function workQueue(Request $request)
    {
        $uid=(int)$request->attributes->get('auth_user')['id'];
        $onlyMine=!$this->has($request,'requests.view_all')||$request->boolean('onlyMine');
        $queue=(string)$request->query('queue','');
        $requestType=(string)$request->query('serviceType',$request->query('requestType',''));
        $status=(string)$request->query('status','');
        $priority=(string)$request->query('priority','');
        $assignedLawyerId=(int)$request->query('assignedLawyerId',0);
        $paymentStatus=(string)$request->query('paymentStatus','');
        $from=(string)$request->query('from','');
        $to=(string)$request->query('to','');
        $search=trim((string)$request->query('search',''));

        $where=["(?::boolean=FALSE OR sr.assigned_lawyer_id=?)"];
        $bindings=[$onlyMine,$uid];
        if($queue==='needs_attention')$where[]="sr.status IN ('new','revision_requested')";
        elseif($queue==='awaiting_client')$where[]="sr.status IN ('awaiting_client_info','client_review')";
        elseif($queue==='meetings_today')$where[]="EXISTS (SELECT 1 FROM consultation_bookings cb WHERE cb.service_request_id=sr.id AND cb.status IN ('confirmed','meeting_scheduled') AND (cb.slot_start AT TIME ZONE 'Africa/Cairo')::date=(CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Cairo')::date)";
        elseif($queue==='overdue')$where[]="sr.due_at<CURRENT_TIMESTAMP";
        elseif($queue==='new')$where[]="sr.status='new'";
        elseif($queue==='unassigned')$where[]="sr.assigned_lawyer_id IS NULL AND sr.status NOT IN ('completed','cancelled')";
        elseif($queue==='with_lawyer')$where[]="sr.assigned_lawyer_id IS NOT NULL AND sr.status NOT IN ('completed','cancelled')";
        elseif($queue==='awaiting_payment')$where[]="sr.status='awaiting_payment'";
        elseif($queue==='completed')$where[]="sr.status='completed'";
        elseif($queue==='cancelled')$where[]="sr.status='cancelled'";
        if(in_array($requestType,['contract_review','contract_drafting','self_service_lawyer_review'],true)){$where[]='sr.request_type=?';$bindings[]=$requestType;}
        if($status!==''&&preg_match('/^[a-z_]+$/',$status)){$where[]='sr.status=?';$bindings[]=$status;}
        if(in_array($priority,['normal','high'],true)){$where[]='sr.priority=?';$bindings[]=$priority;}
        if($assignedLawyerId>0){$where[]='sr.assigned_lawyer_id=?';$bindings[]=$assignedLawyerId;}
        if(preg_match('/^\d{4}-\d{2}-\d{2}$/',$from)){$where[]='sr.updated_at>=?::date';$bindings[]=$from;}
        if(preg_match('/^\d{4}-\d{2}-\d{2}$/',$to)){$where[]="sr.updated_at<?::date + INTERVAL '1 day'";$bindings[]=$to;}
        if($search!==''){$where[]='(sr.serial_number ILIKE ? OR sr.title ILIKE ? OR sr.contract_type_text ILIKE ? OR client.name ILIKE ?)';$like='%'.$search.'%';array_push($bindings,$like,$like,$like,$like);}
        $sql='SELECT sr.id,sr.serial_number AS "serialNumber",sr.request_type AS "requestType",sr.request_purpose AS "requestPurpose",sr.contract_type_text AS "contractTypeText",sr.title,sr.status,sr.priority,sr.due_at AS "dueAt",sr.assigned_lawyer_id AS "assignedLawyerId",sr.created_at AS "createdAt",sr.updated_at AS "updatedAt",sr.metadata_json AS "projectionMetadata",COALESCE(sr.meeting_at,booking.slot_start) AS "meetingAt",booking.status AS "bookingStatus",client.name AS "clientName",client.phone AS "clientPhone",lawyer.name AS "assignedLawyerName",latest_payment.status AS "latestPaymentStatus",latest_payment.amount_egp::float AS "paymentAmountEgp",COALESCE(approved.amount,0)::float AS "approvedPaidEgp",COALESCE(deliverable_summary.count,0)::int AS "deliverablesCount",deliverable_summary.current_type AS "currentDeliverableType",COALESCE(deliverable_summary.current_is_final,FALSE) AS "currentDeliverableIsFinal" FROM service_requests sr LEFT JOIN users client ON client.id=sr.client_user_id LEFT JOIN users lawyer ON lawyer.id=sr.assigned_lawyer_id LEFT JOIN LATERAL (SELECT cb.slot_start,cb.status FROM consultation_bookings cb WHERE cb.service_request_id=sr.id ORDER BY cb.updated_at DESC,cb.id DESC LIMIT 1) booking ON TRUE LEFT JOIN LATERAL (SELECT p.status,p.amount_egp FROM payments p WHERE p.service_request_id=sr.id ORDER BY p.created_at DESC,p.id DESC LIMIT 1) latest_payment ON TRUE LEFT JOIN LATERAL (SELECT COALESCE(SUM(p.amount_egp) FILTER (WHERE p.status=\'approved\'),0) AS amount FROM payments p WHERE p.service_request_id=sr.id) approved ON TRUE LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count,(ARRAY_AGG(d.deliverable_type ORDER BY d.published_at DESC,d.id DESC))[1] AS current_type,(ARRAY_AGG(d.is_final ORDER BY d.published_at DESC,d.id DESC))[1] AS current_is_final FROM service_request_deliverables d WHERE d.service_request_id=sr.id) deliverable_summary ON TRUE WHERE '.implode(' AND ',$where)." ORDER BY CASE WHEN sr.priority='high' THEN 0 ELSE 1 END,sr.due_at NULLS LAST,sr.created_at DESC LIMIT 300";
        $rows=DB::select($sql,$bindings);
        foreach($rows as $row){
            $metadata=$this->json($row->projectionMetadata);
            $projection=$this->stateProjector->project((int)$row->id,(string)$row->requestType,(string)$row->status,$metadata,$row->latestPaymentStatus?(string)$row->latestPaymentStatus:null,(float)$row->approvedPaidEgp,(int)$row->deliverablesCount,$row->requestPurpose?(string)$row->requestPurpose:null,$row->bookingStatus?(string)$row->bookingStatus:null,$row->currentDeliverableType?(string)$row->currentDeliverableType:null,(bool)$row->currentDeliverableIsFinal,(string)($metadata['paymentStage']??'')==='balance'&&(bool)$row->currentDeliverableIsFinal);
            foreach($projection as $key=>$value)$row->{$key}=$value;
            $row->selectedContractTypeName=$this->selectedContractTypeName($metadata);
            unset($row->projectionMetadata,$row->latestPaymentStatus,$row->approvedPaidEgp,$row->bookingStatus,$row->currentDeliverableType,$row->currentDeliverableIsFinal);
        }
        if($paymentStatus!=='')$rows=array_values(array_filter($rows,fn($row)=>(string)$row->paymentStatus===$paymentStatus));
        if($queue==='ready_delivery')$rows=array_values(array_filter($rows,fn($row)=>(string)$row->deliveryStatus==='ready'));
        return $this->ok($request,$rows);
    }
    private function json(mixed $value):array{if(is_array($value))return$value;if(is_object($value))return(array)$value;if(is_string($value))return json_decode($value,true)?:[];return[];}
    private function selectedContractTypeName(array $metadata): ?string
    {
        $stored=trim((string)($metadata['selectedContractTypeName']??''));
        if($stored!=='')return$stored;
        $slug=trim((string)($metadata['templateSlug']??''));$variantKey=trim((string)($metadata['variantKey']??''));
        if($slug===''||$variantKey==='')return null;
        $row=DB::selectOne("SELECT tv.definition_json FROM contract_templates ct JOIN template_versions tv ON tv.id=ct.current_published_version_id WHERE ct.slug=? AND tv.status='published'",[$slug]);
        if(!$row)return$variantKey;
        $definition=$this->json($row->definition_json);
        foreach($definition['variants']??[] as$variant)if((string)($variant['key']??'')===$variantKey)return(string)($variant['nameAr']??$variantKey);
        return$variantKey;
    }
}
