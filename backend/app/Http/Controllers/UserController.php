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
        $row = DB::selectOne('SELECT id,public_id AS "publicId",name,email,phone,whatsapp_number AS "whatsappNumber",account_type AS "accountType",company_name AS "companyName",reusable_data_json AS "reusableData",email_verified_at AS "emailVerifiedAt",whatsapp_service_consent_at AS "whatsappServiceConsentAt",created_at AS "createdAt" FROM users WHERE id=?', [$request->attributes->get('auth_user')['id']]);
        if($row)$row->reusableData=$this->json($row->reusableData);
        return $this->ok($request, $row);
    }
    public function updateProfile(Request $request)
    {
        $data = $request->validate(['name' => ['nullable','string','max:150'], 'phone' => ['nullable','string','max:30'], 'whatsappNumber' => ['nullable','string','max:30'], 'companyName' => ['nullable','string','max:180'], 'reusableData'=>['sometimes','array','max:12']]);
        $id = $request->attributes->get('auth_user')['id'];
        $reusable=array_key_exists('reusableData',$data)?$this->reusableData($data['reusableData']):null;
        if(array_key_exists('reusableData',$data))$data['reusableData']=$reusable;
        $row = DB::selectOne('UPDATE users SET name=COALESCE(?,name),phone=COALESCE(?,phone),whatsapp_number=COALESCE(?,whatsapp_number),company_name=COALESCE(?,company_name),reusable_data_json=COALESCE(?::jsonb,reusable_data_json),updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING id,public_id AS "publicId",name,email,phone,whatsapp_number AS "whatsappNumber",account_type AS "accountType",company_name AS "companyName",reusable_data_json AS "reusableData",email_verified_at AS "emailVerifiedAt",created_at AS "createdAt"', [$data['name'] ?? null,$data['phone'] ?? null,$data['whatsappNumber'] ?? null,$data['companyName'] ?? null,$reusable===null?null:json_encode($reusable,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$id]);
        $row->reusableData=$this->json($row->reusableData);
        $this->audit->write($request, 'user.profile_updated', 'user', $id, null, $data);
        return $this->ok($request, $row, 'تم تحديث الملف الشخصي');
    }
    public function adminIndex(Request $request)
    {
        $search = $request->filled('search') ? '%'.$request->string('search').'%' : null;
        $status = $request->filled('status') ? $request->string('status')->toString() : null;
        $rows = DB::select('SELECT u.id,u.public_id AS "publicId",u.name,u.email,u.phone,u.whatsapp_number AS "whatsappNumber",u.whatsapp_service_consent_at AS "whatsappServiceConsentAt",u.account_type AS "accountType",u.company_name AS "companyName",u.status,u.email_verified_at IS NOT NULL AS "emailVerified",u.created_at AS "createdAt",COUNT(DISTINCT c.id)::int AS "contractsCount",COUNT(DISTINCT sr.id)::int AS "requestsCount" FROM users u LEFT JOIN staff_profiles sp ON sp.user_id=u.id LEFT JOIN contracts c ON c.client_user_id=u.id OR c.user_id=u.id LEFT JOIN service_requests sr ON sr.client_user_id=u.id WHERE sp.user_id IS NULL AND (?::text IS NULL OR u.name ILIKE ? OR u.email ILIKE ? OR u.phone ILIKE ? OR u.whatsapp_number ILIKE ? OR u.public_id ILIKE ? OR u.company_name ILIKE ?) AND (?::text IS NULL OR u.status=?) GROUP BY u.id ORDER BY u.created_at DESC LIMIT 300', [$search,$search,$search,$search,$search,$search,$search,$status,$status]);
        return $this->ok($request, $rows);
    }
    public function assignableLawyers(Request $request)
    {
        if(!config('zdraft.features.assignment'))throw new ApiException(404,'ميزة إسناد المحامين مخفية حاليًا','FEATURE_DISABLED');
        $rows=DB::select("SELECT u.id,u.public_id AS \"publicId\",u.name AS \"displayName\",sp.job_title AS \"specialization\",NULL::text AS \"profileImage\",COUNT(DISTINCT sr.id) FILTER (WHERE sr.status NOT IN ('completed','cancelled'))::int AS \"activeRequestsCount\",COUNT(DISTINCT c.id) FILTER (WHERE c.status NOT IN ('issued','cancelled'))::int AS \"activeContractsCount\" FROM users u JOIN staff_profiles sp ON sp.user_id=u.id JOIN staff_role_assignments sra ON sra.user_id=u.id JOIN roles r ON r.id=sra.role_id AND r.role_key='lawyer' LEFT JOIN service_requests sr ON sr.assigned_lawyer_id=u.id LEFT JOIN contracts c ON c.assigned_lawyer_id=u.id AND c.deleted_at IS NULL WHERE u.status='active' AND sp.staff_status='active' GROUP BY u.id,u.public_id,u.name,sp.job_title ORDER BY u.name LIMIT 200");
        return $this->ok($request,$rows);
    }
    public function adminShow(Request $request, int $id)
    {
        if ($id <= 0) throw new ApiException(400, 'رقم العميل غير صالح');
        $profile = DB::selectOne('SELECT u.id,u.public_id AS "publicId",u.name,u.email,u.phone,u.whatsapp_number AS "whatsappNumber",u.account_type AS "accountType",u.company_name AS "companyName",u.status,u.suspension_reason AS "suspensionReason",u.suspended_at AS "suspendedAt",u.email_verified_at AS "emailVerifiedAt",u.whatsapp_service_consent_at AS "whatsappServiceConsentAt",u.whatsapp_marketing_consent_at AS "whatsappMarketingConsentAt",u.created_at AS "createdAt",u.updated_at AS "updatedAt",(SELECT COUNT(*)::int FROM auth_sessions s WHERE s.user_id=u.id AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP) AS "activeSessions",(SELECT COUNT(*)::int FROM document_attachments a WHERE a.owner_user_id=u.id) AS "attachmentsCount",(SELECT COALESCE(SUM(p.amount_egp) FILTER (WHERE p.status=\'approved\'),0)::float FROM payments p WHERE p.user_id=u.id) AS "approvedPaymentsEgp" FROM users u LEFT JOIN staff_profiles sp ON sp.user_id=u.id WHERE u.id=? AND sp.user_id IS NULL', [$id]);
        if (!$profile) throw new ApiException(404, 'العميل غير موجود');
        $contracts = DB::select('SELECT c.id,c.serial_number AS "serialNumber",c.title,c.status,c.source_channel AS "sourceChannel",c.billing_mode AS "billingMode",c.original_price_egp::float AS "priceEgp",c.created_at AS "createdAt",c.updated_at AS "updatedAt",c.issued_at AS "issuedAt",ct.name_ar AS "templateNameAr",ct.slug AS "templateSlug",lawyer.name AS "assignedLawyerName" FROM contracts c JOIN contract_templates ct ON ct.id=c.template_id LEFT JOIN users lawyer ON lawyer.id=c.assigned_lawyer_id WHERE c.deleted_at IS NULL AND (c.client_user_id=? OR c.user_id=?) ORDER BY c.updated_at DESC LIMIT 100', [$id,$id]);
        $requests = DB::select('SELECT sr.id,sr.serial_number AS "serialNumber",sr.request_type AS "requestType",sr.request_purpose AS "requestPurpose",sr.contract_type_text AS "contractTypeText",sr.title,sr.status,sr.priority,sr.communication_channel AS "communicationChannel",sr.meeting_at AS "meetingAt",sr.created_at AS "createdAt",sr.updated_at AS "updatedAt",lawyer.name AS "assignedLawyerName" FROM service_requests sr LEFT JOIN users lawyer ON lawyer.id=sr.assigned_lawyer_id WHERE sr.client_user_id=? ORDER BY sr.updated_at DESC LIMIT 100', [$id]);
        $payments = DB::select('SELECT p.id,p.serial_number AS "serialNumber",p.amount_egp::float AS "amountEgp",p.status,p.payment_method AS "paymentMethod",p.contract_id AS "contractId",p.service_request_id AS "serviceRequestId",p.admin_notes AS "adminNotes",p.created_at AS "createdAt",p.reviewed_at AS "reviewedAt" FROM payments p WHERE p.user_id=? ORDER BY p.created_at DESC LIMIT 100', [$id]);
        $activity = DB::select('SELECT al.id,al.action,al.entity_type AS "entityType",al.entity_id AS "entityId",al.created_at AS "createdAt",actor.name AS "actorName" FROM audit_logs al LEFT JOIN users actor ON actor.id=al.actor_user_id WHERE (al.entity_type=\'user\' AND al.entity_id=?::text) OR (al.entity_type=\'contract\' AND EXISTS (SELECT 1 FROM contracts c WHERE c.id::text=al.entity_id AND (c.client_user_id=? OR c.user_id=?))) OR (al.entity_type=\'service_request\' AND EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id::text=al.entity_id AND sr.client_user_id=?)) OR (al.entity_type=\'payment\' AND EXISTS (SELECT 1 FROM payments p WHERE p.id::text=al.entity_id AND p.user_id=?)) ORDER BY al.created_at DESC LIMIT 80', [$id,$id,$id,$id,$id]);
        return $this->ok($request, compact('profile','contracts','requests','payments','activity'));
    }
    public function adminStatus(Request $request, int $id)
    {
        $data = $request->validate(['status' => ['required','in:active,suspended'],'reason'=>['nullable','string','max:1000']]);
        if($data['status']==='suspended'&&trim((string)($data['reason']??''))==='')throw new ApiException(422,'سبب تعليق الحساب مطلوب','SUSPENSION_REASON_REQUIRED');
        $actor=(int)$request->attributes->get('auth_user')['id'];
        if ($id === $actor && $data['status'] === 'suspended') throw new ApiException(409, 'لا يمكنك تعليق حسابك الحالي');
        if($data['status']==='suspended')$row=DB::selectOne('UPDATE users u SET status=?,suspension_reason=?,suspended_at=CURRENT_TIMESTAMP,suspended_by=?,updated_at=CURRENT_TIMESTAMP WHERE u.id=? AND NOT EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.user_id=u.id) RETURNING u.id',[$data['status'],trim((string)$data['reason']),$actor,$id]);
        else $row=DB::selectOne('UPDATE users u SET status=?,suspension_reason=NULL,suspended_at=NULL,suspended_by=NULL,updated_at=CURRENT_TIMESTAMP WHERE u.id=? AND NOT EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.user_id=u.id) RETURNING u.id',[$data['status'],$id]);
        if (!$row) throw new ApiException(404, 'العميل غير موجود');
        if ($data['status'] === 'suspended') DB::table('auth_sessions')->where('user_id',$id)->update(['revoked_at' => now()]);
        $this->audit->write($request, 'user.status_changed', 'user', $id, null, ['status' => $data['status'],'reason'=>$data['reason']??null]);
        return $this->ok($request, ['id' => $id, 'status' => $data['status']], 'تم تحديث حالة الحساب');
    }

    private function reusableData(array $input): array
    {
        $allowed=['nationalId','nationality','address','commercialRegister','taxNumber','taxCard','legalRepresentative','representativeCapacity'];
        $unknown=array_values(array_diff(array_keys($input),$allowed));
        if($unknown)throw new ApiException(422,'توجد بيانات غير مسموح بحفظها في الملف الشخصي','PROFILE_REUSABLE_FIELDS_INVALID',['fields'=>$unknown]);
        $result=[];
        foreach($input as$key=>$value){
            if($value===null){$result[$key]=null;continue;}
            if(!is_scalar($value)||is_bool($value))throw new ApiException(422,'بيانات الملف القابلة لإعادة الاستخدام يجب أن تكون نصوصًا أو أرقامًا','PROFILE_REUSABLE_VALUE_INVALID',['field'=>$key]);
            $value=is_string($value)?trim($value):$value;
            if(is_string($value)&&mb_strlen($value)>500)throw new ApiException(422,'إحدى بيانات الملف الشخصي أطول من الحد المسموح','PROFILE_REUSABLE_VALUE_TOO_LONG',['field'=>$key]);
            $result[$key]=$value;
        }
        return$result;
    }
    private function json(mixed$value):array{if(is_array($value))return$value;if(is_object($value))return(array)$value;if(is_string($value)){$decoded=json_decode($value,true);return is_array($decoded)?$decoded:[];}return[];}
}
