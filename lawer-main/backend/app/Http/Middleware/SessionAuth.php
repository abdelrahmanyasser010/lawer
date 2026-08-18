<?php
namespace App\Http\Middleware;
use App\Exceptions\ApiException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
final class SessionAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->attributes->get('auth_user')) throw new ApiException(401, 'يجب تسجيل الدخول أولًا', 'UNAUTHENTICATED');
        if (($request->attributes->get('auth_user')['status'] ?? null) === 'suspended') throw new ApiException(403, 'الحساب موقوف. تواصل مع الإدارة', 'ACCOUNT_SUSPENDED');
        return $next($request);
    }
}
