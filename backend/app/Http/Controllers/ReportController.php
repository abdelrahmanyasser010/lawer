<?php
namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

final class ReportController extends Controller
{
    use ApiResponse;

    public function overview(Request $request)
    {
        $r=$this->range($request->query('period'));
        $start=$r['start'];$end=$r['end'];$previousStart=$r['previousStart'];$previousEnd=$r['previousEnd'];

        $payments=DB::selectOne("SELECT
            COALESCE(SUM(amount_egp) FILTER (WHERE status='approved' AND reviewed_at>=? AND reviewed_at<?),0)::float AS current_revenue,
            COALESCE(SUM(amount_egp) FILTER (WHERE status='approved' AND reviewed_at>=? AND reviewed_at<?),0)::float AS previous_revenue,
            COUNT(*) FILTER (WHERE status='approved' AND reviewed_at>=? AND reviewed_at<?)::int AS approved_payments,
            COUNT(*) FILTER (WHERE status IN ('pending_verification','needs_client_info'))::int AS pending_payments
            FROM payments",[$start,$end,$previousStart,$previousEnd,$start,$end]);

        $contracts=DB::selectOne("SELECT
            (SELECT COUNT(*)::int FROM contracts c WHERE c.deleted_at IS NULL AND c.created_at>=? AND c.created_at<?) AS contracts_created,
            (SELECT COUNT(DISTINCT cv.contract_id)::int FROM contract_versions cv JOIN contracts c ON c.id=cv.contract_id WHERE c.deleted_at IS NULL AND cv.issued_at>=? AND cv.issued_at<?) AS contracts_issued,
            (SELECT COUNT(*)::int FROM contracts c WHERE c.deleted_at IS NULL AND c.created_at>=? AND c.created_at<? AND EXISTS (SELECT 1 FROM contract_versions cv WHERE cv.contract_id=c.id AND cv.issued_at IS NOT NULL)) AS created_cohort_issued,
            (SELECT COUNT(*)::int FROM contracts c WHERE c.deleted_at IS NULL AND c.source_channel='office' AND c.created_at>=? AND c.created_at<?) AS office_contracts",[$start,$end,$start,$end,$start,$end,$start,$end]);

        $requests=DB::selectOne("SELECT
            COUNT(*) FILTER (WHERE created_at>=? AND created_at<?)::int AS requests_created,
            COUNT(*) FILTER (WHERE completed_at>=? AND completed_at<?)::int AS requests_completed,
            COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at-created_at))/3600) FILTER (WHERE completed_at>=? AND completed_at<?),0)::float AS average_completion_hours,
            COUNT(*) FILTER (WHERE due_at<CURRENT_TIMESTAMP AND status NOT IN ('completed','cancelled'))::int AS overdue_requests
            FROM service_requests",[$start,$end,$start,$end,$start,$end]);

        $responses=DB::selectOne("WITH scoped AS (
            SELECT sr.id,sr.created_at,
              (SELECT MIN(e.created_at) FROM service_request_events e
               WHERE e.service_request_id=sr.id
                 AND e.visibility='client'
                 AND e.actor_user_id IS DISTINCT FROM sr.client_user_id
                 AND e.event_type IN ('client_update','meeting_scheduled','deliverable_published','contract_linked','status_changed','assigned')) AS first_response
            FROM service_requests sr WHERE sr.created_at>=? AND sr.created_at<?
          ) SELECT
            COALESCE(AVG(EXTRACT(EPOCH FROM (first_response-created_at))/3600) FILTER (WHERE first_response IS NOT NULL),0)::float AS average_first_response_hours,
            COALESCE(100.0 * COUNT(*) FILTER (WHERE first_response IS NOT NULL AND first_response<=created_at+INTERVAL '24 hours') /
              NULLIF(COUNT(*) FILTER (WHERE first_response IS NOT NULL OR created_at<=CURRENT_TIMESTAMP-INTERVAL '24 hours'),0),0)::float AS sla_compliance_percent,
            COUNT(*) FILTER (WHERE first_response IS NULL AND created_at<=CURRENT_TIMESTAMP-INTERVAL '24 hours')::int AS unanswered_over_24
          FROM scoped",[$start,$end]);

        $customers=DB::selectOne("SELECT COUNT(*)::int AS new_customers FROM users u LEFT JOIN staff_profiles sp ON sp.user_id=u.id WHERE sp.user_id IS NULL AND u.created_at>=? AND u.created_at<?",[$start,$end]);

        $interval=$r['bucket']==='month'?'1 month':'1 day';
        $revenue=DB::select("WITH buckets AS (SELECT generate_series(?::timestamptz,(?::timestamptz-INTERVAL '1 second'),INTERVAL '{$interval}') AS bucket)
          SELECT bucket AS \"bucketStart\",COALESCE(SUM(p.amount_egp) FILTER (WHERE p.status='approved'),0)::float AS amount,
          COUNT(p.id) FILTER (WHERE p.status='approved')::int AS \"paymentsCount\"
          FROM buckets b LEFT JOIN payments p ON p.reviewed_at>=b.bucket AND p.reviewed_at<LEAST(b.bucket+INTERVAL '{$interval}',?::timestamptz)
          GROUP BY bucket ORDER BY bucket",[$start,$end,$end]);

        $templates=DB::select("SELECT ct.slug,ct.name_ar AS \"nameAr\",COUNT(c.id)::int AS count,
          COUNT(c.id) FILTER (WHERE c.issued_at>=? AND c.issued_at<?)::int AS issued
          FROM contract_templates ct JOIN contracts c ON c.template_id=ct.id AND c.deleted_at IS NULL AND c.created_at>=? AND c.created_at<?
          GROUP BY ct.id,ct.slug,ct.name_ar HAVING COUNT(c.id)>0 ORDER BY count DESC,ct.name_ar",[$start,$end,$start,$end]);

        $services=DB::select("SELECT request_type AS \"requestType\",COUNT(*)::int AS count,COUNT(*) FILTER (WHERE status='completed')::int AS completed,COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled'))::int AS active FROM service_requests WHERE created_at>=? AND created_at<? GROUP BY request_type ORDER BY count DESC",[$start,$end]);
        $lawyers=config('zdraft.features.team_management')?DB::select("SELECT u.id,u.name,COUNT(sr.id)::int AS \"assignedCount\",COUNT(sr.id) FILTER (WHERE sr.status='completed')::int AS \"completedCount\",COUNT(sr.id) FILTER (WHERE sr.status NOT IN ('completed','cancelled'))::int AS \"activeCount\",COUNT(sr.id) FILTER (WHERE sr.due_at<CURRENT_TIMESTAMP AND sr.status NOT IN ('completed','cancelled'))::int AS \"overdueCount\",COALESCE(AVG(EXTRACT(EPOCH FROM (sr.completed_at-sr.created_at))/3600) FILTER (WHERE sr.completed_at IS NOT NULL),0)::float AS \"averageCompletionHours\" FROM users u JOIN staff_role_assignments sra ON sra.user_id=u.id JOIN roles r ON r.id=sra.role_id AND r.role_key='lawyer' LEFT JOIN service_requests sr ON sr.assigned_lawyer_id=u.id AND sr.created_at>=? AND sr.created_at<? WHERE u.status='active' GROUP BY u.id,u.name ORDER BY \"completedCount\" DESC,\"assignedCount\" DESC,u.name",[$start,$end]):[];
        $contractStatuses=DB::select("SELECT status,COUNT(*)::int AS count FROM contracts WHERE deleted_at IS NULL AND created_at>=? AND created_at<? GROUP BY status ORDER BY count DESC",[$start,$end]);
        $requestStatuses=DB::select("SELECT status,COUNT(*)::int AS count FROM service_requests WHERE created_at>=? AND created_at<? GROUP BY status ORDER BY count DESC",[$start,$end]);

        $current=(float)($payments->current_revenue??0);$previous=(float)($payments->previous_revenue??0);$created=(int)($contracts->contracts_created??0);$cohortIssued=(int)($contracts->created_cohort_issued??0);
        return $this->ok($request,[
          'period'=>$r['period'],'range'=>['start'=>$start,'end'=>$end,'bucket'=>$r['bucket'],'timezone'=>'Africa/Cairo'],
          'metrics'=>[
            'currentRevenue'=>$current,'previousRevenue'=>$previous,'revenueGrowthPercent'=>$previous>0?(($current-$previous)/$previous)*100:($current>0?100:0),
            'approvedPayments'=>(int)($payments->approved_payments??0),'pendingPayments'=>(int)($payments->pending_payments??0),
            'contractsCreated'=>$created,'contractsIssued'=>(int)($contracts->contracts_issued??0),'contractIssueRatePercent'=>$created>0?($cohortIssued/$created)*100:0,
            'officeContracts'=>(int)($contracts->office_contracts??0),'requestsCreated'=>(int)($requests->requests_created??0),'requestsCompleted'=>(int)($requests->requests_completed??0),
            'averageCompletionHours'=>(float)($requests->average_completion_hours??0),'averageFirstResponseHours'=>(float)($responses->average_first_response_hours??0),
            'slaCompliancePercent'=>(float)($responses->sla_compliance_percent??0),'unansweredOver24'=>(int)($responses->unanswered_over_24??0),
            'overdueRequests'=>(int)($requests->overdue_requests??0),'newCustomers'=>(int)($customers->new_customers??0),
          ],
          'revenueSeries'=>$revenue,'templateDistribution'=>$templates,'serviceDistribution'=>$services,'lawyerPerformance'=>$lawyers,
          'contractStatuses'=>$contractStatuses,'requestStatuses'=>$requestStatuses,'generatedAt'=>now('Africa/Cairo')->toIso8601String(),
        ]);
    }

    public function customerExport(Request $request)
    {
        $r=$this->range($request->query('period'));
        $rows=DB::select("WITH contract_counts AS (SELECT customer_id,COUNT(*)::int AS count FROM (SELECT id,COALESCE(client_user_id,user_id) AS customer_id FROM contracts WHERE deleted_at IS NULL AND created_at>=? AND created_at<?) scoped WHERE customer_id IS NOT NULL GROUP BY customer_id),request_counts AS (SELECT client_user_id AS customer_id,COUNT(*)::int AS count FROM service_requests WHERE client_user_id IS NOT NULL AND created_at>=? AND created_at<? GROUP BY client_user_id),payment_totals AS (SELECT user_id AS customer_id,COALESCE(SUM(amount_egp),0)::float AS total FROM payments WHERE status='approved' AND reviewed_at>=? AND reviewed_at<? GROUP BY user_id) SELECT u.public_id AS \"publicId\",u.name,u.email,u.phone,u.whatsapp_number AS \"whatsappNumber\",u.account_type AS \"accountType\",u.company_name AS \"companyName\",u.status,COALESCE(cc.count,0)::int AS \"contractsCount\",COALESCE(rc.count,0)::int AS \"requestsCount\",COALESCE(pt.total,0)::float AS \"approvedPaymentsEgp\" FROM users u LEFT JOIN staff_profiles sp ON sp.user_id=u.id LEFT JOIN contract_counts cc ON cc.customer_id=u.id LEFT JOIN request_counts rc ON rc.customer_id=u.id LEFT JOIN payment_totals pt ON pt.customer_id=u.id WHERE sp.user_id IS NULL ORDER BY \"approvedPaymentsEgp\" DESC,u.created_at DESC LIMIT 10001",[$r['start'],$r['end'],$r['start'],$r['end'],$r['start'],$r['end']]);
        if(count($rows)>10000)throw new ApiException(413,'حجم التقرير أكبر من الحد المسموح');
        return $this->ok($request,['period'=>$r['period'],'range'=>['start'=>$r['start'],'end'=>$r['end']],'rows'=>$rows]);
    }

    private function range(mixed $value):array
    {
        $period=in_array($value,['quarter','year'],true)?$value:'month';
        $now=CarbonImmutable::now('Africa/Cairo');
        if($period==='year'){$start=$now->startOfYear();$prev=$start->subYear();$bucket='month';}
        elseif($period==='quarter'){$start=$now->startOfQuarter();$prev=$start->subMonths(3);$bucket='month';}
        else{$start=$now->startOfMonth();$prev=$start->subMonth();$bucket='day';}
        $elapsed=max(1,$now->getTimestamp()-$start->getTimestamp());$previousEnd=$prev->addSeconds($elapsed);if($previousEnd->greaterThan($start))$previousEnd=$start;
        return['period'=>$period,'start'=>$start->toIso8601String(),'end'=>$now->toIso8601String(),'previousStart'=>$prev->toIso8601String(),'previousEnd'=>$previousEnd->toIso8601String(),'bucket'=>$bucket];
    }
}
