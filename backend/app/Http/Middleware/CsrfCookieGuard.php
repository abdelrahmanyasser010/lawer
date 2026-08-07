<?php
namespace App\Http\Middleware;
use App\Exceptions\ApiException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
final class CsrfCookieGuard
{
    public function handle(Request $request, Closure $next): Response
    {
        if (in_array($request->method(), ['POST','PUT','PATCH','DELETE'], true) && $request->attributes->get('auth_user')) {
            $cookie = (string) $request->cookie(config('zdraft.csrf_cookie'));
            $header = (string) $request->header('X-CSRF-Token');
            if ($cookie === '' || $header === '' || !hash_equals($cookie, $header)) throw new ApiException(403, 'رمز الحماية غير صالح', 'CSRF_REJECTED');
        }
        return $next($request);
    }
}
