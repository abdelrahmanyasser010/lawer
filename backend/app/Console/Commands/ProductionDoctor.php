<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

final class ProductionDoctor extends Command
{
    protected $signature = 'zdraft:doctor {--json : Print machine-readable JSON}';
    protected $description = 'Check whether the Laravel backend is ready for VPS production deployment';

    /** @var array<int,array{key:string,title:string,severity:string,message:string,details?:mixed}> */
    private array $checks = [];

    public function handle(): int
    {
        $this->checkPhpExtensions();
        $this->checkAppEnvironment();
        $this->checkUrls();
        $this->checkCookiesAndDebug();
        $this->checkSuperAdminSeed();
        $this->checkDatabase();
        $this->checkMail();
        $this->checkStorage();
        $this->checkWeasyPrint();
        $this->checkDeployAssets();

        $blockers = count(array_filter($this->checks, fn (array $check): bool => $check['severity'] === 'blocker'));
        $warnings = count(array_filter($this->checks, fn (array $check): bool => $check['severity'] === 'warning'));
        $passes = count(array_filter($this->checks, fn (array $check): bool => $check['severity'] === 'pass'));
        $payload = [
            'generatedAt' => now()->toIso8601String(),
            'environment' => app()->environment(),
            'ready' => $blockers === 0,
            'summary' => [
                'total' => count($this->checks),
                'passed' => $passes,
                'warnings' => $warnings,
                'blockers' => $blockers,
            ],
            'checks' => $this->checks,
        ];

        if ($this->option('json')) {
            $this->line(json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        } else {
            $this->line('Z draft production doctor');
            foreach ($this->checks as $check) {
                $this->line(sprintf('[%s] %s: %s', strtoupper($check['severity']), $check['title'], $check['message']));
            }
        }

        return $blockers === 0 ? self::SUCCESS : self::FAILURE;
    }

    private function checkPhpExtensions(): void
    {
        $required = ['pdo_pgsql', 'fileinfo', 'mbstring', 'openssl', 'intl', 'bcmath', 'curl', 'zip', 'imagick'];
        $missing = array_values(array_filter($required, fn (string $extension): bool => !extension_loaded($extension)));
        $this->add(
            'php_extensions',
            'امتدادات PHP المطلوبة',
            $missing ? 'blocker' : 'pass',
            $missing ? 'امتدادات ناقصة: '.implode(', ', $missing) : 'كل امتدادات PHP المطلوبة مفعلة',
            ['required' => $required, 'missing' => $missing]
        );
    }

    private function checkAppEnvironment(): void
    {
        $key = (string) config('app.key');
        $this->add('app_key', 'APP_KEY', $key !== '' ? 'pass' : 'blocker', $key !== '' ? 'APP_KEY مضبوط' : 'APP_KEY غير مضبوط. نفذ php artisan key:generate');

        $env = (string) config('app.env');
        $debug = (bool) config('app.debug');
        $ok = $env === 'production' && !$debug;
        $this->add(
            'app_environment',
            'بيئة Laravel',
            $ok ? 'pass' : 'blocker',
            $ok ? 'APP_ENV=production و APP_DEBUG=false' : 'يجب ضبط APP_ENV=production و APP_DEBUG=false قبل الإنتاج',
            ['APP_ENV' => $env, 'APP_DEBUG' => $debug]
        );
    }

    private function checkUrls(): void
    {
        $urls = [
            'APP_URL' => (string) config('app.url'),
            'FRONTEND_URL' => (string) config('zdraft.frontend_url'),
            'DASHBOARD_URL' => (string) config('zdraft.dashboard_url'),
        ];
        $bad = [];
        foreach ($urls as $key => $url) {
            if (!$this->isProductionUrl($url)) {
                $bad[$key] = $url;
            }
        }
        $this->add(
            'https_urls',
            'روابط HTTPS',
            $bad ? 'blocker' : 'pass',
            $bad ? 'روابط غير جاهزة للإنتاج: '.implode(', ', array_keys($bad)) : 'كل الروابط HTTPS وبدون قيم تجريبية',
            $bad ?: $urls
        );
    }

    private function checkCookiesAndDebug(): void
    {
        $this->add(
            'secure_cookies',
            'كوكيز آمنة',
            config('zdraft.cookie_secure') ? 'pass' : 'blocker',
            config('zdraft.cookie_secure') ? 'COOKIE_SECURE مفعّل' : 'يجب تفعيل COOKIE_SECURE على HTTPS'
        );
        $this->add(
            'cookie_domain',
            'نطاق الكوكيز',
            config('zdraft.cookie_domain') ? 'pass' : 'warning',
            config('zdraft.cookie_domain') ? 'COOKIE_DOMAIN مضبوط' : 'COOKIE_DOMAIN غير مضبوط؛ قد يكون مقبولًا لو كل خدمة على دومين منفصل بدون مشاركة كوكيز'
        );
        $this->add(
            'debug_tokens',
            'إظهار رموز التحقق',
            config('zdraft.expose_debug_tokens') ? 'blocker' : 'pass',
            config('zdraft.expose_debug_tokens') ? 'EXPOSE_DEBUG_TOKENS مفعّل ويجب قفله' : 'EXPOSE_DEBUG_TOKENS مقفول'
        );
    }

    private function checkSuperAdminSeed(): void
    {
        $email = strtolower(trim((string) config('zdraft.super_admin_email')));
        $password = (string) config('zdraft.super_admin_password');
        $badEmail = $email === '' || str_contains($email, 'example.com') || $email === 'admin@example.com';
        $badPassword = strlen($password) < 12 || str_contains($password, 'CHANGE_') || str_contains($password, 'PASSWORD');
        $this->add(
            'super_admin_seed',
            'بيانات السوبر أدمن',
            ($badEmail || $badPassword) ? 'blocker' : 'pass',
            ($badEmail || $badPassword) ? 'بيانات السوبر أدمن ما زالت افتراضية أو ضعيفة' : 'بيانات السوبر أدمن جاهزة للـseed',
            ['email' => $email ?: null, 'passwordLength' => strlen($password)]
        );
    }

    private function checkDatabase(): void
    {
        try {
            DB::selectOne('SELECT 1');
            $templates = 0;
            try {
                $templates = (int) DB::table('contract_templates')->count();
            } catch (\Throwable) {
                // Schema may not have been migrated yet.
            }
            $this->add(
                'database_connection',
                'اتصال PostgreSQL',
                $templates > 0 ? 'pass' : 'blocker',
                $templates > 0 ? "الاتصال ناجح والقوالب المزروعة: {$templates}" : 'الاتصال ناجح لكن القوالب غير موجودة؛ شغّل migrations والـseed',
                ['templatesCount' => $templates]
            );
        } catch (\Throwable $e) {
            $this->add('database_connection', 'اتصال PostgreSQL', 'blocker', 'تعذر الاتصال بقاعدة البيانات', $e->getMessage());
        }
    }

    private function checkMail(): void
    {
        $mailer = (string) config('mail.default');
        $username = (string) config('mail.mailers.smtp.username');
        $password = (string) config('mail.mailers.smtp.password');
        $from = (string) config('mail.from.address');
        $bad = $mailer === 'log'
            || ($mailer === 'smtp' && ($username === '' || $password === '' || str_contains($password, 'PUT_')))
            || str_contains($from, 'example.com');
        $this->add(
            'mail_provider',
            'إرسال البريد',
            $bad ? 'blocker' : 'pass',
            $bad ? 'إعدادات البريد غير جاهزة للإنتاج' : "مزود البريد جاهز: {$mailer}",
            ['mailer' => $mailer, 'usernameSet' => $username !== '', 'passwordSet' => $password !== '', 'from' => $from]
        );
    }

    private function checkStorage(): void
    {
        foreach (['private' => 'المرفقات الخاصة', 'contracts' => 'ملفات العقود'] as $disk => $title) {
            try {
                $root = (string) config("filesystems.disks.{$disk}.root");
                if ($root === '') {
                    $this->add("storage_{$disk}", $title, 'blocker', 'مسار التخزين غير مضبوط');
                    continue;
                }
                if (!is_dir($root)) {
                    @mkdir($root, 0770, true);
                }
                $probe = '.doctor/'.bin2hex(random_bytes(6));
                Storage::disk($disk)->put($probe, 'ok');
                Storage::disk($disk)->delete($probe);
                $public = realpath(public_path()) ?: public_path();
                $realRoot = realpath($root) ?: $root;
                $insidePublic = str_starts_with(str_replace('\\', '/', $realRoot), str_replace('\\', '/', $public));
                $this->add(
                    "storage_{$disk}",
                    $title,
                    $insidePublic ? 'blocker' : 'pass',
                    $insidePublic ? 'مسار التخزين داخل public وهذا غير آمن' : 'مسار التخزين خاص وقابل للكتابة',
                    ['root' => $root]
                );
            } catch (\Throwable $e) {
                $this->add("storage_{$disk}", $title, 'blocker', 'تعذر الكتابة في مسار التخزين', $e->getMessage());
            }
        }
    }

    private function checkWeasyPrint(): void
    {
        $binary = (string) config('zdraft.weasyprint_binary');
        $result = $this->runBinary([$binary, '--version']);
        $this->add(
            'weasyprint',
            'مولد PDF العربي',
            $result['ok'] ? 'pass' : 'blocker',
            $result['ok'] ? trim($result['output']) : 'تعذر تشغيل WeasyPrint',
            ['binary' => $binary, 'output' => $result['output']]
        );
    }

    private function checkDeployAssets(): void
    {
        $files = [
            base_path('deploy/nginx/api.conf'),
            base_path('deploy/systemd/zdraft-laravel-scheduler.service'),
            base_path('deploy/install-ubuntu.sh'),
        ];
        $missing = array_values(array_filter($files, fn (string $file): bool => !is_file($file)));
        $this->add(
            'deploy_assets',
            'ملفات النشر',
            $missing ? 'warning' : 'pass',
            $missing ? 'بعض ملفات النشر غير موجودة' : 'ملفات Nginx وsystemd وسكريبت التثبيت موجودة',
            ['missing' => $missing]
        );
    }

    private function isProductionUrl(string $url): bool
    {
        if (!str_starts_with($url, 'https://')) {
            return false;
        }
        return !str_contains($url, 'example.com') && !str_contains($url, 'localhost') && !str_contains($url, '127.0.0.1');
    }

    /** @return array{ok:bool,output:string} */
    private function runBinary(array $command): array
    {
        try {
            $process = new Process($command);
            $process->setTimeout(15);
            $process->run();
            return ['ok' => $process->isSuccessful(), 'output' => trim($process->getOutput().' '.$process->getErrorOutput())];
        } catch (\Throwable $e) {
            return ['ok' => false, 'output' => $e->getMessage()];
        }
    }

    private function add(string $key, string $title, string $severity, string $message, mixed $details = null): void
    {
        $check = compact('key', 'title', 'severity', 'message');
        if ($details !== null) {
            $check['details'] = $details;
        }
        $this->checks[] = $check;
    }
}
