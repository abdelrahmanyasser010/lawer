<?php
namespace App\Http\Middleware;
use App\Exceptions\ApiException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
final class RequirePermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->attributes->get('auth_user');
        if (!$user) throw new ApiException(401, 'يجب تسجيل الدخول أولًا', 'UNAUTHENTICATED');
        if (in_array('super_admin', $user['roles'] ?? [], true)) return $next($request);
        foreach ($permissions as $permission) if (in_array($permission, $user['permissions'] ?? [], true)) return $next($request);
        throw new ApiException(403, 'ليس لديك صلاحية لتنفيذ هذا الإجراء', 'FORBIDDEN');
    }
}
