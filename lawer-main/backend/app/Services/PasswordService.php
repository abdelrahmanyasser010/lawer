<?php
namespace App\Services;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\Process\Process;
final class PasswordService
{
    public function hash(string $password): string { return Hash::make($password); }
    public function verify(string $password, ?string $encoded): bool
    {
        if (!$encoded) return false;
        if (!str_starts_with($encoded, 'scrypt$')) return Hash::check($password, $encoded);
        $parts = explode('$', $encoded);
        if (count($parts) !== 6) return false;
        [, $n, $r, $p, $salt, $expected] = $parts;
        if (!ctype_digit($n.$r.$p) || !ctype_xdigit($expected)) return false;
        $process = new Process([
            'openssl', 'kdf', '-keylen', (string) (strlen($expected) / 2),
            '-kdfopt', 'pass:'.$password, '-kdfopt', 'salt:'.$salt,
            '-kdfopt', 'n:'.$n, '-kdfopt', 'r:'.$r, '-kdfopt', 'p:'.$p, 'SCRYPT',
        ]);
        $process->setTimeout(10);
        $process->run();
        if (!$process->isSuccessful()) return false;
        $actual = strtolower(str_replace([":", "\r", "\n", ' '], '', $process->getOutput()));
        return hash_equals(strtolower($expected), $actual);
    }
    public function needsRehash(?string $encoded): bool { return !$encoded || str_starts_with($encoded, 'scrypt$') || Hash::needsRehash($encoded); }
}
