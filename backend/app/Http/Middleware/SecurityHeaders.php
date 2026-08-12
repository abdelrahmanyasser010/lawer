<?php
namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->headers->get('Origin');
        if ($origin && !self::originAllowed($origin)) {
            throw new ApiException(403, 'Origin is not allowed by CORS', 'CORS_REJECTED');
        }
        return self::decorate($request, $next($request));
    }

    public static function decorate(Request $request, Response $response): Response
    {
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'no-referrer');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        $response->headers->set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
        if (app()->environment('production')) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        $origin = $request->headers->get('Origin');
        if ($origin && self::originAllowed($origin)) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Vary', 'Origin');
        }
        if ($request->isMethod('OPTIONS')) {
            $response->headers->set('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, X-Request-Id');
            $response->headers->set('Access-Control-Max-Age', '600');
        }
        return $response;
    }

    private static function originAllowed(string $origin): bool
    {
        $allowed = array_values(array_filter(array_merge([
            config('zdraft.frontend_url'),
            config('zdraft.dashboard_url'),
        ], (array) config('zdraft.cors_extra_origins', []))));
        return in_array(rtrim($origin, '/'), array_map(static fn ($value) => rtrim((string) $value, '/'), $allowed), true);
    }
}
