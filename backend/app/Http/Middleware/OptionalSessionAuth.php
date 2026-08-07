<?php
namespace App\Http\Middleware;
use App\Support\Security;
use App\Support\UserPresenter;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
final class OptionalSessionAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $raw = $request->cookie(config('zdraft.session_cookie'));
        if ($raw) {
            $rows = DB::select(
                "SELECT s.id AS session_id,u.* FROM auth_sessions s JOIN users u ON u.id=s.user_id
                 WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP LIMIT 1",
                [Security::sha256($raw)]
            );
            if ($rows) {
                $user = $rows[0];
                DB::update('UPDATE auth_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?', [$user->session_id]);
                $request->attributes->set('auth_user', UserPresenter::make($user));
                $request->attributes->set('auth_user_row', $user);
                $request->attributes->set('session_id', (int) $user->session_id);
            }
        }
        return $next($request);
    }
}
