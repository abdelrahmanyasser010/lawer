<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

final class NotificationOutboxSchedulingTest extends TestCase
{
    public function test_email_outbox_command_is_registered_and_scheduled_every_minute(): void
    {
        $root = dirname(__DIR__, 3);
        $bootstrap = file_get_contents($root.'/backend/bootstrap/app.php');
        $schedule = file_get_contents($root.'/backend/routes/console.php');
        $command = file_get_contents($root.'/backend/app/Console/Commands/ProcessNotificationOutbox.php');

        $this->assertStringContainsString("->withCommands([__DIR__.'/../app/Console/Commands'])", $bootstrap);
        $this->assertStringContainsString("commands: __DIR__.'/../routes/console.php'", $bootstrap);
        $this->assertStringContainsString("protected \$signature='zdraft:process-outbox {--limit=50}'", $command);
        $this->assertStringContainsString("Schedule::command('zdraft:process-outbox --limit=50')->everyMinute()->withoutOverlapping()", $schedule);
    }

    public function test_outbox_processor_sends_and_records_delivery_state(): void
    {
        $root = dirname(__DIR__, 3);
        $command = file_get_contents($root.'/backend/app/Console/Commands/ProcessNotificationOutbox.php');

        $this->assertStringContainsString("Mail::html", $command);
        $this->assertStringContainsString("status IN ('pending','retry')", $command);
        $this->assertStringContainsString("status='processing'", $command);
        $this->assertStringContainsString("status='sent'", $command);
        $this->assertStringContainsString("\$status=\$attempts>=5?'failed':'retry'", $command);
    }

    public function test_vps_deploy_treats_scheduler_as_required_production_service(): void
    {
        $root = dirname(__DIR__, 3);
        $deploy = file_get_contents($root.'/backend/deploy/scripts/deploy-vps.sh');
        $unit = file_get_contents($root.'/backend/deploy/systemd/zdraft-laravel-scheduler.service');

        $this->assertStringContainsString('BACKEND_DIR=${BACKEND_DIR:-/home/abdo2/htdocs/api.zdraft.tech}', $deploy);
        $this->assertStringContainsString('APP_USER=${APP_USER:-abdo2}', $deploy);
        $this->assertStringContainsString('APP_GROUP=${APP_GROUP:-${APP_USER}}', $deploy);
        $this->assertStringContainsString('User=abdo2', $unit);
        $this->assertStringContainsString('Group=abdo2', $unit);
        $this->assertStringContainsString('WorkingDirectory=/home/abdo2/htdocs/api.zdraft.tech', $unit);
        $this->assertStringContainsString('ExecStart=/usr/bin/php artisan schedule:work', $unit);
        $this->assertStringContainsString('ensure_laravel_scheduler', $deploy);
        $this->assertStringContainsString('artisan list --raw | grep -F "zdraft:process-outbox"', $deploy);
        $this->assertStringContainsString('artisan schedule:list | grep -F "zdraft:process-outbox"', $deploy);
        $this->assertStringContainsString('WorkingDirectory=${BACKEND_DIR}', $deploy);
        $this->assertStringContainsString('User=${APP_USER}', $deploy);
        $this->assertStringContainsString('Group=${APP_GROUP}', $deploy);
        $this->assertStringContainsString('systemctl enable --now zdraft-laravel-scheduler.service', $deploy);
        $this->assertStringContainsString('systemctl restart zdraft-laravel-scheduler.service', $deploy);
        $this->assertStringContainsString('systemctl is-active --quiet zdraft-laravel-scheduler.service', $deploy);
        $this->assertStringNotContainsString('systemctl restart zdraft-laravel-scheduler.service || true', $deploy);
    }

    public function test_vps_deploy_is_backend_only_for_real_production_layout(): void
    {
        $root = dirname(__DIR__, 3);
        $deploy = file_get_contents($root.'/backend/deploy/scripts/deploy-vps.sh');

        $this->assertStringContainsString('composer install --no-dev', $deploy);
        $this->assertStringContainsString('artisan migrate --force', $deploy);
        $this->assertStringNotContainsString('/var/www/zdraft', $deploy);
        $this->assertStringNotContainsString('ROOT_DIR=', $deploy);
        $this->assertStringNotContainsString('FRONTEND_DIR=', $deploy);
        $this->assertStringNotContainsString('DASHBOARD_DIR=', $deploy);
        $this->assertStringNotContainsString('artisan migrate --seed --force', $deploy);
        $this->assertStringNotContainsString('npm install', $deploy);
        $this->assertStringNotContainsString('npm run build:engine', $deploy);
        $this->assertStringNotContainsString('npm --workspace frontend run build', $deploy);
        $this->assertStringNotContainsString('npm --workspace zdraft-dashboard run build', $deploy);
        $this->assertStringNotContainsString('systemctl restart zdraft-frontend.service', $deploy);
        $this->assertStringNotContainsString('systemctl restart zdraft-dashboard.service', $deploy);
    }
}
