<?php
namespace App\Support;

use Symfony\Component\HttpFoundation\Cookie;

final class Security
{
    public static function sha256(string $value): string { return hash('sha256', $value); }
    public static function randomToken(int $bytes = 32): string { return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '='); }
    public static function numericCode(int $digits = 6): string
    {
        $max = (10 ** $digits) - 1;
        return str_pad((string) random_int(0, $max), $digits, '0', STR_PAD_LEFT);
    }
    public static function cookie(string $name, string $value, int $minutes, bool $httpOnly): Cookie
    {
        $sameSite = strtolower((string) config('zdraft.cookie_same_site', 'lax'));
        if (!in_array($sameSite, ['lax', 'strict', 'none'], true)) $sameSite = 'lax';
        $secure = (bool) config('zdraft.cookie_secure', app()->environment('production')) || $sameSite === 'none';
        return cookie($name, $value, $minutes, '/', config('zdraft.cookie_domain'), $secure, $httpOnly, false, $sameSite);
    }
    public static function expiredCookie(string $name): Cookie
    {
        return cookie()->forget($name, '/', config('zdraft.cookie_domain'));
    }
}
