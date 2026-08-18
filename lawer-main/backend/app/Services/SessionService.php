<?php
namespace App\Services;
use App\Support\AuthAudience;
use App\Support\Security;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Cookie;
final class SessionService
{
    /** @return array{0:Cookie,1:Cookie,2:string} */
    public function create(int $userId, Request $request): array
    {
        $sessionToken = Security::randomToken(48);
        $csrfToken = Security::randomToken(24);
        $ttlHours = (int) config('zdraft.session_ttl_hours');
        DB::insert(
            'INSERT INTO auth_sessions (user_id,token_hash,ip_address,user_agent,expires_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP + (? * INTERVAL \'1 hour\'))',
            [$userId, Security::sha256($sessionToken), $request->ip(), $request->userAgent(), $ttlHours]
        );
        $minutes = $ttlHours * 60;
        return [
            Security::cookie(AuthAudience::sessionCookie($request), $sessionToken, $minutes, true),
            Security::cookie(AuthAudience::csrfCookie($request), $csrfToken, $minutes, false),
            $csrfToken,
        ];
    }
}
