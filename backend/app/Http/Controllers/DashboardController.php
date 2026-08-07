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
        $requests=DB::selectOne("SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE status='new')::int AS unassigned,COUNT(*) FILTER (WHERE status='awaiting_client_info')::int AS awaiting_client,COUNT(*) FILTER (WHERE status='meeting_scheduled' AND due_at::date=CURRENT_DATE)::int AS meetings_today,COUNT(*) FILTER (WHERE due_at<CURRENT_TIMESTAMP AND status NOT IN ('completed','cancelled'))::int AS overdue FROM service_requests WHERE (?::boolean=TRUE OR assigned_lawyer_id=?)",[$allRequests,$uid]);
        $paymentData=$payments?DB::selectOne("SELECT COUNT(*) FILTER (WHERE status='pending_verification')::int AS pending,COALESCE(SUM(amount_egp) FILTER (WHERE status='approved' AND reviewed_at>=date_trunc('month',CURRENT_TIMESTAMP)),0)::float AS approved_month FROM payments"):(object)['pending'=>0,'approved_month'=>0];
        $notifications=DB::selectOne('SELECT COUNT(*)::int AS unread FROM dashboard_notifications WHERE recipient_user_id=? AND read_at IS NULL',[$uid]);
        return $this->ok($request,['contracts'=>$contracts,'requests'=>$requests,'payments'=>$paymentData,'notifications'=>$notifications]);
    }
    public function workQueue(Request $request)
    {
        $uid=$request->attributes->get('auth_user')['id'];$onlyMine=!$this->has($request,'requests.view_all')||$request->boolean('onlyMine');
        $rows=DB::select("SELECT sr.id,sr.serial_number AS \"serialNumber\",sr.request_type AS \"requestType\",sr.title,sr.status,sr.priority,sr.due_at AS \"dueAt\",client.name AS \"clientName\",lawyer.name AS \"assignedLawyerName\" FROM service_requests sr LEFT JOIN users client ON client.id=sr.client_user_id LEFT JOIN users lawyer ON lawyer.id=sr.assigned_lawyer_id WHERE (?::boolean=FALSE OR sr.assigned_lawyer_id=?) AND sr.status NOT IN ('awaiting_payment','completed','cancelled') ORDER BY CASE WHEN sr.priority='high' THEN 0 ELSE 1 END,sr.due_at NULLS LAST,sr.created_at LIMIT 100",[$onlyMine,$uid]);
        return $this->ok($request,$rows);
    }
}
