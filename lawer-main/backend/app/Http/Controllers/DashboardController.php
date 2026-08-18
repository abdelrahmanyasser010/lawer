<?php
namespace App\Http\Controllers;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
final class DashboardController extends Controller
{
    use ApiResponse;
    private function has(Request $request,string $permission):bool{$u=$request->attributes->get('auth_user');return in_array('super_admin',$u['roles']??[],true)||in_array($permission,$u['permissions']??[],true);}
    public function summary(Request $request)
    {
        $uid=$request->attributes->get('auth_user')['id'];$allContracts=$this->has($request,'contracts.view_all');$allRequests=$this->has($request,'requests.view_all');$payments=$this->has($request,'payments.review')||$this->has($request,'reports.view');
        $contracts=DB::selectOne("SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE status IN ('pending_review','assigned','in_progress','revision_requested'))::int AS active,COUNT(*) FILTER (WHERE status='issued')::int AS issued,COUNT(*) FILTER (WHERE source_channel='office')::int AS office FROM contracts WHERE deleted_at IS NULL AND (?::boolean=TRUE OR assigned_lawyer_id=?)",[$allContracts,$uid]);
        $requests=DB::selectOne("SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE status IN ('new','revision_requested'))::int AS needs_attention,COUNT(*) FILTER (WHERE status='new')::int AS unassigned,COUNT(*) FILTER (WHERE status IN ('awaiting_client_info','client_review'))::int AS awaiting_client,COUNT(*) FILTER (WHERE status='meeting_scheduled' AND meeting_at::date=(CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Cairo')::date)::int AS meetings_today,COUNT(*) FILTER (WHERE due_at<CURRENT_TIMESTAMP AND status NOT IN ('awaiting_payment','completed','cancelled'))::int AS overdue FROM service_requests WHERE (?::boolean=TRUE OR assigned_lawyer_id=?)",[$allRequests,$uid]);
        $paymentData=$payments?DB::selectOne("SELECT COUNT(*) FILTER (WHERE status IN ('pending_verification','needs_client_info'))::int AS pending,COALESCE(SUM(amount_egp) FILTER (WHERE status='approved' AND reviewed_at>=date_trunc('month',CURRENT_TIMESTAMP)),0)::float AS approved_month FROM payments"):(object)['pending'=>0,'approved_month'=>0];
        $notifications=DB::selectOne('SELECT COUNT(*)::int AS unread FROM dashboard_notifications WHERE recipient_user_id=? AND read_at IS NULL',[$uid]);
        return $this->ok($request,['contracts'=>$contracts,'requests'=>$requests,'payments'=>$paymentData,'notifications'=>$notifications]);
    }
    public function workQueue(Request $request)
    {
        $uid=(int)$request->attributes->get('auth_user')['id'];
        $onlyMine=!$this->has($request,'requests.view_all')||$request->boolean('onlyMine');
        $queue=(string)$request->query('queue','');
        $requestType=(string)$request->query('requestType','');
        $status=(string)$request->query('status','');
        $priority=(string)$request->query('priority','');
        $search=trim((string)$request->query('search',''));

        $where=["(?::boolean=FALSE OR sr.assigned_lawyer_id=?)","sr.status NOT IN ('awaiting_payment','completed','cancelled')"];
        $bindings=[$onlyMine,$uid];
        if($queue==='needs_attention')$where[]="sr.status IN ('new','revision_requested')";
        elseif($queue==='awaiting_client')$where[]="sr.status IN ('awaiting_client_info','client_review')";
        elseif($queue==='meetings_today')$where[]="sr.status='meeting_scheduled' AND sr.meeting_at::date=(CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Cairo')::date";
        elseif($queue==='overdue')$where[]="sr.due_at<CURRENT_TIMESTAMP";
        if(in_array($requestType,['consultation','contract_review','contract_drafting'],true)){$where[]='sr.request_type=?';$bindings[]=$requestType;}
        if($status!==''&&preg_match('/^[a-z_]+$/',$status)){$where[]='sr.status=?';$bindings[]=$status;}
        if(in_array($priority,['normal','high'],true)){$where[]='sr.priority=?';$bindings[]=$priority;}
        if($search!==''){$where[]='(sr.serial_number ILIKE ? OR sr.title ILIKE ? OR client.name ILIKE ?)';$like='%'.$search.'%';array_push($bindings,$like,$like,$like);}
        $sql='SELECT sr.id,sr.serial_number AS "serialNumber",sr.request_type AS "requestType",sr.title,sr.status,sr.priority,sr.due_at AS "dueAt",sr.meeting_at AS "meetingAt",client.name AS "clientName",lawyer.name AS "assignedLawyerName" FROM service_requests sr LEFT JOIN users client ON client.id=sr.client_user_id LEFT JOIN users lawyer ON lawyer.id=sr.assigned_lawyer_id WHERE '.implode(' AND ',$where)." ORDER BY CASE WHEN sr.priority='high' THEN 0 ELSE 1 END,sr.due_at NULLS LAST,sr.created_at DESC LIMIT 200";
        return $this->ok($request,DB::select($sql,$bindings));
    }
}
