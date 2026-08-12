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

        $this->assertStringContainsString('ensure_laravel_scheduler', $deploy);
        $this->assertStringContainsString('artisan list --raw | grep -F "zdraft:process-outbox"', $deploy);
        $this->assertStringContainsString('artisan schedule:list | grep -F "zdraft:process-outbox"', $deploy);
        $this->assertStringContainsString('systemctl enable --now zdraft-laravel-scheduler.service', $deploy);
        $this->assertStringContainsString('systemctl is-active --quiet zdraft-laravel-scheduler.service', $deploy);
        $this->assertStringNotContainsString('systemctl restart zdraft-laravel-scheduler.service || true', $deploy);
    }
}
