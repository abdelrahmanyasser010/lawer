<?php
namespace App\Support;

use Illuminate\Http\Request;

final class AuthAudience
{
    public const FRONTEND = 'frontend';
    public const DASHBOARD = 'dashboard';

    public static function resolve(Request $request): string
    {
        $origin = self::normalizeOrigin((string) $request->headers->get('Origin', ''));
        $frontendOrigin = self::normalizeOrigin((string) config('zdraft.frontend_url'));
        $dashboardOrigin = self::normalizeOrigin((string) config('zdraft.dashboard_url'));

        if ($origin !== '') {
            if ($dashboardOrigin !== '' && hash_equals($dashboardOrigin, $origin)) return self::DASHBOARD;
            if ($frontendOrigin !== '' && hash_equals($frontendOrigin, $origin)) return self::FRONTEND;
        }

        $referer = (string) $request->headers->get('Referer', '');
        if ($referer !== '') {
            $refererOrigin = self::normalizeOrigin($referer);
            if ($dashboardOrigin !== '' && $refererOrigin === $dashboardOrigin) return self::DASHBOARD;
            if ($frontendOrigin !== '' && $refererOrigin === $frontendOrigin) return self::FRONTEND;
        }

        if ($request->is('api/*/dashboard', 'api/*/dashboard/*', 'api/*/admin', 'api/*/admin/*')) return self::DASHBOARD;

        return self::FRONTEND;
    }

    public static function sessionCookie(Request $request): string
    {
        return self::sessionCookieFor(self::resolve($request));
    }

    public static function csrfCookie(Request $request): string
    {
        return self::csrfCookieFor(self::resolve($request));
    }

    public static function sessionCookieFor(string $audience): string
    {
        return $audience === self::DASHBOARD
            ? (string) config('zdraft.dashboard_session_cookie')
            : (string) config('zdraft.frontend_session_cookie');
    }

    public static function csrfCookieFor(string $audience): string
    {
        return $audience === self::DASHBOARD
            ? (string) config('zdraft.dashboard_csrf_cookie')
            : (string) config('zdraft.frontend_csrf_cookie');
    }

    /** @param array<string,mixed> $user */
    public static function allows(array $user, string $audience): bool
    {
        $roles = array_values(array_filter((array) ($user['roles'] ?? []), 'is_string'));
        $isStaff = (bool) array_filter($roles, static fn (string $role): bool => $role !== 'customer');
        return $audience === self::DASHBOARD ? $isStaff : !$isStaff;
    }

    private static function normalizeOrigin(string $url): string
    {
        $url = trim($url);
        if ($url === '') return '';
        $parts = parse_url($url);
        if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) return '';
        $origin = strtolower($parts['scheme']).'://'.strtolower($parts['host']);
        if (isset($parts['port'])) $origin .= ':'.(int) $parts['port'];
        return $origin;
    }
}
