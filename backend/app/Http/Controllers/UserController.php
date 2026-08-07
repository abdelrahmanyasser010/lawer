<?php
namespace App\Http\Controllers;
use App\Exceptions\ApiException;
use App\Services\AuditService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
final class UserController extends Controller
{
    use ApiResponse;
    public function __construct(private AuditService $audit) {}
    public function profile(Request $request)
    {
        $row = DB::selectOne('SELECT id,public_id AS "publicId",name,email,phone,whatsapp_number AS "whatsappNumber",account_type AS "accountType",company_name AS "companyName",email_verified_at AS "emailVerifiedAt",whatsapp_service_consent_at AS "whatsappServiceConsentAt",created_at AS "createdAt" FROM users WHERE id=?', [$request->attributes->get('auth_user')['id']]);
        return $this->ok($request, $row);
    }
    public function updateProfile(Request $request)
    {
        $data = $request->validate(['name' => ['nullable','string','max:150'], 'phone' => ['nullable','string','max:30'], 'whatsappNumber' => ['nullable','string','max:30'], 'companyName' => ['nullable','string','max:180']]);
        $id = $request->attributes->get('auth_user')['id'];
        $row = DB::selectOne('UPDATE users SET name=COALESCE(?,name),phone=COALESCE(?,phone),whatsapp_number=COALESCE(?,whatsapp_number),company_name=COALESCE(?,company_name),updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING id,public_id AS "publicId",name,email,phone,whatsapp_number AS "whatsappNumber",account_type AS "accountType",company_name AS "companyName",email_verified_at AS "emailVerifiedAt",created_at AS "createdAt"', [$data['name'] ?? null,$data['phone'] ?? null,$data['whatsappNumber'] ?? null,$data['companyName'] ?? null,$id]);
        $this->audit->write($request, 'user.profile_updated', 'user', $id, null, $data);
        return $this->ok($request, $row, 'تم تحديث الملف الشخصي');
    }
    public function adminIndex(Request $request)
    {
        $search = $request->filled('search') ? '%'.$request->string('search').'%' : null;
        $status = $request->filled('status') ? $request->string('status')->toString() : null;
        $rows = DB::select('SELECT u.id,u.public_id AS "publicId",u.name,u.email,u.phone,u.whatsapp_number AS "whatsappNumber",u.account_type AS "accountType",u.company_name AS "companyName",u.status,u.email_verified_at IS NOT NULL AS "emailVerified",u.created_at AS "createdAt",COUNT(DISTINCT c.id)::int AS "contractsCount",COUNT(DISTINCT sr.id)::int AS "requestsCount" FROM users u LEFT JOIN staff_profiles sp ON sp.user_id=u.id LEFT JOIN contracts c ON c.client_user_id=u.id OR c.user_id=u.id LEFT JOIN service_requests sr ON sr.client_user_id=u.id WHERE sp.user_id IS NULL AND (?::text IS NULL OR u.name ILIKE ? OR u.email ILIKE ? OR u.phone ILIKE ?) AND (?::text IS NULL OR u.status=?) GROUP BY u.id ORDER BY u.created_at DESC LIMIT 300', [$search,$search,$search,$search,$status,$status]);
        return $this->ok($request, $rows);
    }
    public function adminShow(Request $request, int $id)
    {
        if ($id <= 0) throw new ApiException(400, 'رقم العميل غير صالح');
        $profile = DB::selectOne('SELECT u.id,u.public_id AS "publicId",u.name,u.email,u.phone,u.whatsapp_number AS "whatsappNumber",u.account_type AS "accountType",u.company_name AS "companyName",u.status,u.email_verified_at AS "emailVerifiedAt",u.whatsapp_service_consent_at AS "whatsappServiceConsentAt",u.whatsapp_marketing_consent_at AS "whatsappMarketingConsentAt",u.created_at AS "createdAt",u.updated_at AS "updatedAt",(SELECT COUNT(*)::int FROM auth_sessions s WHERE s.user_id=u.id AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP) AS "activeSessions",(SELECT COUNT(*)::int FROM document_attachments a WHERE a.owner_user_id=u.id) AS "attachmentsCount",(SELECT COALESCE(SUM(p.amount_egp) FILTER (WHERE p.status=\'approved\'),0)::float FROM payments p WHERE p.user_id=u.id) AS "approvedPaymentsEgp" FROM users u LEFT JOIN staff_profiles sp ON sp.user_id=u.id WHERE u.id=? AND sp.user_id IS NULL', [$id]);
        if (!$profile) throw new ApiException(404, 'العميل غير موجود');
        $contracts = DB::select('SELECT c.id,c.serial_number AS "serialNumber",c.title,c.status,c.source_channel AS "sourceChannel",c.billing_mode AS "billingMode",c.original_price_egp::float AS "priceEgp",c.created_at AS "createdAt",c.updated_at AS "updatedAt",c.issued_at AS "issuedAt",ct.name_ar AS "templateNameAr",ct.slug AS "templateSlug",lawyer.name AS "assignedLawyerName" FROM contracts c JOIN contract_templates ct ON ct.id=c.template_id LEFT JOIN users lawyer ON lawyer.id=c.assigned_lawyer_id WHERE c.deleted_at IS NULL AND (c.client_user_id=? OR c.user_id=?) ORDER BY c.updated_at DESC LIMIT 100', [$id,$id]);
        $requests = DB::select('SELECT sr.id,sr.serial_number AS "serialNumber",sr.request_type AS "requestType",sr.title,sr.status,sr.priority,sr.communication_channel AS "communicationChannel",sr.meeting_at AS "meetingAt",sr.created_at AS "createdAt",sr.updated_at AS "updatedAt",lawyer.name AS "assignedLawyerName" FROM service_requests sr LEFT JOIN users lawyer ON lawyer.id=sr.assigned_lawyer_id WHERE sr.client_user_id=? ORDER BY sr.updated_at DESC LIMIT 100', [$id]);
        $payments = DB::select('SELECT p.id,p.serial_number AS "serialNumber",p.amount_egp::float AS "amountEgp",p.status,p.payment_method AS "paymentMethod",p.contract_id AS "contractId",p.service_request_id AS "serviceRequestId",p.admin_notes AS "adminNotes",p.created_at AS "createdAt",p.reviewed_at AS "reviewedAt" FROM payments p WHERE p.user_id=? ORDER BY p.created_at DESC LIMIT 100', [$id]);
        $activity = DB::select('SELECT al.id,al.action,al.entity_type AS "entityType",al.entity_id AS "entityId",al.created_at AS "createdAt",actor.name AS "actorName" FROM audit_logs al LEFT JOIN users actor ON actor.id=al.actor_user_id WHERE (al.entity_type=\'user\' AND al.entity_id=?::text) OR (al.entity_type=\'contract\' AND EXISTS (SELECT 1 FROM contracts c WHERE c.id::text=al.entity_id AND (c.client_user_id=? OR c.user_id=?))) OR (al.entity_type=\'service_request\' AND EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id::text=al.entity_id AND sr.client_user_id=?)) OR (al.entity_type=\'payment\' AND EXISTS (SELECT 1 FROM payments p WHERE p.id::text=al.entity_id AND p.user_id=?)) ORDER BY al.created_at DESC LIMIT 80', [$id,$id,$id,$id,$id]);
        return $this->ok($request, compact('profile','contracts','requests','payments','activity'));
    }
    public function adminStatus(Request $request, int $id)
    {
        $data = $request->validate(['status' => ['required','in:active,suspended']]);
        if ($id === $request->attributes->get('auth_user')['id'] && $data['status'] === 'suspended') throw new ApiException(409, 'لا يمكنك تعليق حسابك الحالي');
        $row = DB::selectOne('UPDATE users u SET status=?,updated_at=CURRENT_TIMESTAMP WHERE u.id=? AND NOT EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.user_id=u.id) RETURNING u.id', [$data['status'],$id]);
        if (!$row) throw new ApiException(404, 'العميل غير موجود');
        if ($data['status'] === 'suspended') DB::table('auth_sessions')->where('user_id',$id)->update(['revoked_at' => now()]);
        $this->audit->write($request, 'user.status_changed', 'user', $id, null, ['status' => $data['status']]);
        return $this->ok($request, ['id' => $id, 'status' => $data['status']], 'تم تحديث حالة الحساب');
    }
}
