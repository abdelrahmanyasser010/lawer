<?php
namespace App\Http\Controllers;
use App\Exceptions\ApiException;
use App\Services\AuditService;
use App\Services\NotificationService;
use App\Services\PasswordService;
use App\Services\SessionService;
use App\Support\ApiResponse;
use App\Support\AuthAudience;
use App\Support\Security;
use App\Support\UserPresenter;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
final class AuthController extends Controller
{
    use ApiResponse;
    public function __construct(private SessionService $sessions, private NotificationService $notifications, private AuditService $audit, private PasswordService $passwords) {}

    public function register(Request $request)
    {
        if (AuthAudience::resolve($request) !== AuthAudience::FRONTEND) throw new ApiException(403, 'إنشاء حسابات العملاء متاح من واجهة العملاء فقط', 'AUTH_AUDIENCE_FORBIDDEN');
        $data = $request->validate([
            'fullName' => ['required','string','max:150'],
            'email' => ['required','email','max:255'],
            'password' => ['required','string','min:8','max:128','regex:/[A-Za-z\x{0600}-\x{06FF}]/u','regex:/\d/'],
            'accountType' => ['nullable','in:individual,business'],
            'companyName' => ['nullable','string','max:180'],
            'phone' => ['nullable','string','max:30'],
            'whatsappNumber' => ['nullable','string','max:30'],
            'whatsappServiceConsent' => ['nullable','boolean'],
            'agreedToTerms' => ['accepted'],
        ]);
        $email = strtolower(trim($data['email']));
        if (($data['accountType'] ?? 'individual') === 'business' && empty($data['companyName'])) throw new ApiException(422, 'اسم الشركة مطلوب', 'VALIDATION_ERROR', ['field' => 'companyName']);
        $result = DB::transaction(function () use ($request,$data,$email): array {
            if (DB::table('users')->whereRaw('lower(email)=lower(?)', [$email])->exists()) throw new ApiException(409, 'البريد الإلكتروني مستخدم بالفعل', 'EMAIL_EXISTS');
            $id = DB::table('users')->insertGetId([
                'public_id' => 'USR-'.strtoupper(substr(hash('md5', random_bytes(16).microtime(true)),0,12)),
                'pubg_id' => strtoupper(substr(hash('md5', random_bytes(16)),0,8)),
                'name' => trim($data['fullName']), 'email' => $email, 'phone' => $data['phone'] ?? null,
                'password_hash' => $this->passwords->hash($data['password']),
                'account_type' => $data['accountType'] ?? 'individual', 'company_name' => $data['companyName'] ?? null,
                'whatsapp_number' => $data['whatsappNumber'] ?? ($data['phone'] ?? null),
                'whatsapp_service_consent_at' => !empty($data['whatsappServiceConsent']) ? now() : null,
                'status' => 'active', 'created_at' => now(), 'updated_at' => now(),
            ]);
            $code = Security::numericCode(6);
            DB::table('email_verification_tokens')->insert([
                'user_id' => $id, 'token_hash' => Security::sha256($id.':'.$code),
                'expires_at' => now()->addMinutes(config('zdraft.otp_ttl_minutes')),
                'attempt_count' => 0, 'max_attempts' => config('zdraft.otp_max_attempts'), 'delivery_method' => 'otp', 'created_at' => now(),
            ]);
            $user = DB::table('users')->where('id', $id)->first();
            $this->notifications->email($email, 'verify_email_otp', 'رمز تأكيد بريدك الإلكتروني في Z draft', ['name' => $user->name, 'verificationCode' => $code, 'expiresMinutes' => config('zdraft.otp_ttl_minutes')]);
            $this->audit->write($request, 'auth.registered', 'user', $id, null, ['email' => $email, 'accountType' => $data['accountType'] ?? 'individual'], $id);
            return ['user' => $user, 'code' => $code];
        });
        [$sessionCookie,$csrfCookie,$csrfToken] = $this->sessions->create((int) $result['user']->id, $request);
        $payload = ['user' => UserPresenter::make($result['user']), 'verificationRequired' => true, 'otpExpiresMinutes' => config('zdraft.otp_ttl_minutes'), 'csrfToken' => $csrfToken];
        if (config('zdraft.expose_debug_tokens')) $payload['debugVerificationCode'] = $result['code'];
        return $this->created($request, $payload, 'تم إنشاء الحساب وإرسال رمز التأكيد إلى بريدك')->withCookie($sessionCookie)->withCookie($csrfCookie);
    }

    public function login(Request $request)
    {
        $data = $request->validate(['email' => ['required','email','max:255'], 'password' => ['required','string','max:128']]);
        $user = DB::table('users')->whereRaw('lower(email)=lower(?)', [strtolower($data['email'])])->first();
        if (!$user || !$this->passwords->verify($data['password'], $user->password_hash ?? null)) throw new ApiException(401, 'بيانات الدخول غير صحيحة', 'INVALID_CREDENTIALS');
        if (($user->status ?? '') === 'suspended') throw new ApiException(403, 'الحساب موقوف. تواصل مع الإدارة', 'ACCOUNT_SUSPENDED');
        $presented = UserPresenter::make($user);
        $audience = AuthAudience::resolve($request);
        if (!AuthAudience::allows($presented, $audience)) throw new ApiException(403, $audience === AuthAudience::DASHBOARD ? 'هذا الحساب غير مخول للدخول إلى لوحة التحكم' : 'حسابات الإدارة لا تسجل الدخول من واجهة العملاء', 'AUTH_AUDIENCE_FORBIDDEN');
        if ($this->passwords->needsRehash($user->password_hash ?? null)) DB::table('users')->where('id', $user->id)->update(['password_hash' => $this->passwords->hash($data['password']), 'updated_at' => now()]);
        [$sessionCookie,$csrfCookie,$csrfToken] = $this->sessions->create((int) $user->id, $request);
        DB::table('staff_profiles')->where('user_id', $user->id)->update(['last_login_at' => now()]);
        $this->audit->write($request, 'auth.login', 'user', $user->id, null, null, (int) $user->id);
        return $this->ok($request, ['user' => $presented, 'csrfToken' => $csrfToken], 'تم تسجيل الدخول بنجاح')->withCookie($sessionCookie)->withCookie($csrfCookie);
    }

    public function logout(Request $request)
    {
        if ($request->attributes->get('session_id')) DB::table('auth_sessions')->where('id', $request->attributes->get('session_id'))->update(['revoked_at' => now()]);
        return $this->ok($request, null, 'تم تسجيل الخروج')->withCookie(Security::expiredCookie(AuthAudience::sessionCookie($request)))->withCookie(Security::expiredCookie(AuthAudience::csrfCookie($request)));
    }
    public function me(Request $request)
    {
        $csrfCookieName = AuthAudience::csrfCookie($request);
        $csrfToken = (string) $request->cookie($csrfCookieName);
        $response = $this->ok($request, ['user' => $request->attributes->get('auth_user'), 'csrfToken' => $csrfToken ?: ($csrfToken = Security::randomToken(24))]);
        if (!$request->cookie($csrfCookieName)) {
            $response->withCookie(Security::cookie($csrfCookieName, $csrfToken, ((int) config('zdraft.session_ttl_hours')) * 60, false));
        }
        return $response;
    }

    public function requestVerification(Request $request)
    {
        $auth = $request->attributes->get('auth_user');
        if ($auth['emailVerified']) return $this->ok($request, ['alreadyVerified' => true], 'البريد مؤكد بالفعل');
        $recent = DB::table('email_verification_tokens')->where('user_id', $auth['id'])->whereNull('consumed_at')->orderByDesc('id')->first();
        if ($recent) {
            $seconds = now()->diffInSeconds($recent->created_at, true);
            $cooldown = config('zdraft.otp_resend_cooldown_seconds');
            if ($seconds < $cooldown) throw new ApiException(429, 'يمكن إعادة إرسال الرمز بعد '.($cooldown-$seconds).' ثانية', 'OTP_RESEND_COOLDOWN', ['retryAfterSeconds' => $cooldown-$seconds]);
        }
        $code = Security::numericCode(6);
        DB::transaction(function () use ($auth,$code): void {
            DB::table('email_verification_tokens')->where('user_id', $auth['id'])->whereNull('consumed_at')->update(['consumed_at' => now()]);
            DB::table('email_verification_tokens')->insert([
                'user_id' => $auth['id'], 'token_hash' => Security::sha256($auth['id'].':'.$code), 'expires_at' => now()->addMinutes(config('zdraft.otp_ttl_minutes')),
                'attempt_count' => 0, 'max_attempts' => config('zdraft.otp_max_attempts'), 'delivery_method' => 'otp', 'created_at' => now(),
            ]);
            $this->notifications->email($auth['email'], 'verify_email_otp', 'رمز تأكيد البريد الإلكتروني', ['name' => $auth['name'], 'verificationCode' => $code, 'expiresMinutes' => config('zdraft.otp_ttl_minutes')]);
        });
        $payload = ['expiresMinutes' => config('zdraft.otp_ttl_minutes'), 'resendAfterSeconds' => config('zdraft.otp_resend_cooldown_seconds')];
        if (config('zdraft.expose_debug_tokens')) $payload['debugVerificationCode'] = $code;
        return $this->ok($request, $payload, 'تم إرسال رمز تأكيد جديد');
    }

    public function verifyEmail(Request $request)
    {
        $auth = $request->attributes->get('auth_user');
        if ($auth['emailVerified']) return $this->ok($request, ['verified' => true, 'alreadyVerified' => true], 'البريد مؤكد بالفعل');
        $data = $request->validate(['code' => ['required','regex:/^\d{6}$/']]);
        $result = DB::transaction(function () use ($auth,$data): array {
            $row = DB::selectOne('SELECT id,user_id,token_hash,attempt_count,max_attempts FROM email_verification_tokens WHERE user_id=? AND consumed_at IS NULL AND expires_at>CURRENT_TIMESTAMP ORDER BY id DESC LIMIT 1 FOR UPDATE', [$auth['id']]);
            if (!$row) return ['status' => 'expired'];
            if ($row->attempt_count >= $row->max_attempts) return ['status' => 'locked'];
            if (!hash_equals($row->token_hash, Security::sha256($row->user_id.':'.$data['code']))) {
                $next = $row->attempt_count + 1;
                DB::table('email_verification_tokens')->where('id', $row->id)->update(['attempt_count' => $next, 'last_attempt_at' => now()]);
                return ['status' => $next >= $row->max_attempts ? 'locked' : 'invalid', 'remaining' => max(0, $row->max_attempts-$next)];
            }
            DB::table('users')->where('id', $row->user_id)->update(['email_verified_at' => DB::raw('COALESCE(email_verified_at,CURRENT_TIMESTAMP)'), 'updated_at' => now()]);
            DB::table('email_verification_tokens')->where('id', $row->id)->update(['consumed_at' => now()]);
            return ['status' => 'verified', 'userId' => (int) $row->user_id];
        });
        if ($result['status'] === 'expired') throw new ApiException(400, 'رمز التأكيد منتهي أو غير موجود. اطلب رمزًا جديدًا', 'VERIFICATION_CODE_EXPIRED');
        if ($result['status'] === 'locked') throw new ApiException(429, 'تم تجاوز عدد المحاولات. اطلب رمزًا جديدًا', 'VERIFICATION_ATTEMPTS_EXCEEDED');
        if ($result['status'] === 'invalid') throw new ApiException(400, 'رمز غير صحيح. متبقي '.$result['remaining'].' محاولات', 'INVALID_VERIFICATION_CODE', ['remainingAttempts' => $result['remaining']]);
        $this->audit->write($request, 'auth.email_verified', 'user', $result['userId']);
        return $this->ok($request, ['verified' => true], 'تم تأكيد البريد الإلكتروني');
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate(['email' => ['required','email','max:255'], 'audience' => ['nullable','in:frontend,dashboard']]);
        $user = DB::table('users')->whereRaw('lower(email)=lower(?)', [strtolower($data['email'])])->first();
        if ($user) {
            $token = Security::randomToken(32);
            DB::table('password_reset_tokens')->where('user_id', $user->id)->whereNull('consumed_at')->delete();
            DB::table('password_reset_tokens')->insert(['user_id' => $user->id, 'token_hash' => Security::sha256($token), 'expires_at' => now()->addMinutes(config('zdraft.password_reset_ttl_minutes')), 'created_at' => now()]);
            $base = ($data['audience'] ?? 'frontend') === 'dashboard' ? config('zdraft.dashboard_url') : config('zdraft.frontend_url');
            $this->notifications->email($user->email, 'reset_password', 'إعادة تعيين كلمة المرور', ['resetUrl' => rtrim($base,'/').'/reset-password?token='.$token]);
        }
        return $this->ok($request, config('zdraft.expose_debug_tokens') && $user ? ['debug' => 'راجع notification_outbox أو البريد'] : new \stdClass(), 'إذا كان البريد مسجلًا فسيصلك رابط إعادة التعيين');
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate(['token' => ['required','string','max:500'], 'password' => ['required','string','min:8','max:128','regex:/[A-Za-z\x{0600}-\x{06FF}]/u','regex:/\d/']]);
        DB::transaction(function () use ($data): void {
            $row = DB::selectOne('SELECT id,user_id FROM password_reset_tokens WHERE token_hash=? AND consumed_at IS NULL AND expires_at>CURRENT_TIMESTAMP FOR UPDATE', [Security::sha256($data['token'])]);
            if (!$row) throw new ApiException(400, 'رابط إعادة التعيين غير صالح أو منتهي');
            DB::table('users')->where('id', $row->user_id)->update(['password_hash' => $this->passwords->hash($data['password']), 'email_verified_at' => DB::raw('COALESCE(email_verified_at,CURRENT_TIMESTAMP)'), 'updated_at' => now()]);
            DB::table('staff_profiles')->where('user_id', $row->user_id)->update(['password_change_required' => false, 'staff_status' => DB::raw("CASE WHEN staff_status='invited' THEN 'active' ELSE staff_status END"), 'activated_at' => DB::raw('COALESCE(activated_at,CURRENT_TIMESTAMP)'), 'updated_at' => now()]);
            DB::table('password_reset_tokens')->where('id', $row->id)->update(['consumed_at' => now()]);
            DB::table('auth_sessions')->where('user_id', $row->user_id)->update(['revoked_at' => now()]);
        });
        return $this->ok($request, ['reset' => true], 'تم تغيير كلمة المرور. سجّل الدخول من جديد');
    }

    public function changePassword(Request $request)
    {
        $data = $request->validate(['currentPassword' => ['required','string','max:128'], 'newPassword' => ['required','string','min:8','max:128','regex:/[A-Za-z\x{0600}-\x{06FF}]/u','regex:/\d/']]);
        $auth = $request->attributes->get('auth_user');
        $user = DB::table('users')->where('id', $auth['id'])->first();
        if (!$this->passwords->verify($data['currentPassword'], $user->password_hash ?? null)) throw new ApiException(400, 'كلمة المرور الحالية غير صحيحة');
        DB::table('users')->where('id', $auth['id'])->update(['password_hash' => $this->passwords->hash($data['newPassword']), 'email_verified_at' => DB::raw('COALESCE(email_verified_at,CURRENT_TIMESTAMP)'), 'updated_at' => now()]);
        DB::table('staff_profiles')->where('user_id', $auth['id'])->update(['password_change_required' => false, 'staff_status' => DB::raw("CASE WHEN staff_status='invited' THEN 'active' ELSE staff_status END"), 'activated_at' => DB::raw('COALESCE(activated_at,CURRENT_TIMESTAMP)'), 'updated_at' => now()]);
        DB::table('auth_sessions')->where('user_id', $auth['id'])->where('id', '<>', $request->attributes->get('session_id'))->update(['revoked_at' => now()]);
        $this->audit->write($request, 'auth.password_changed', 'user', $auth['id']);
        return $this->ok($request, ['changed' => true], 'تم تغيير كلمة المرور وإلغاء الجلسات الأخرى');
    }

    public function sessions(Request $request)
    {
        $auth = $request->attributes->get('auth_user');
        $rows = DB::select('SELECT id,ip_address AS "ipAddress",user_agent AS "userAgent",created_at AS "createdAt",last_seen_at AS "lastSeenAt",expires_at AS "expiresAt",CASE WHEN id=? THEN TRUE ELSE FALSE END AS current FROM auth_sessions WHERE user_id=? AND revoked_at IS NULL AND expires_at>CURRENT_TIMESTAMP ORDER BY last_seen_at DESC NULLS LAST', [$request->attributes->get('session_id'),$auth['id']]);
        return $this->ok($request, $rows);
    }
    public function revokeSession(Request $request, int $id)
    {
        DB::table('auth_sessions')->where('id', $id)->where('user_id', $request->attributes->get('auth_user')['id'])->update(['revoked_at' => now()]);
        return $this->ok($request, ['revoked' => true], 'تم إلغاء الجلسة');
    }
}
