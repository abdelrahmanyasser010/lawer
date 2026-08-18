<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

final class ProductionDeployOrchestratorTest extends TestCase
{
    public function test_orchestrator_declares_real_production_layout(): void
    {
        $root = dirname(__DIR__, 3);
        $script = file_get_contents($root.'/ops/deploy-zdraft.sh');

        $this->assertStringContainsString('SOURCE_REPO=${SOURCE_REPO:-/home/deploy/zdraft}', $script);
        $this->assertStringContainsString('FRONTEND_DIR=${FRONTEND_DIR:-/home/abdo/htdocs/zdraft.tech}', $script);
        $this->assertStringContainsString('FRONTEND_USER=${FRONTEND_USER:-abdo}', $script);
        $this->assertStringContainsString('DASHBOARD_DIR=${DASHBOARD_DIR:-/home/abdo1/htdocs/dashboard.zdraft.tech}', $script);
        $this->assertStringContainsString('DASHBOARD_USER=${DASHBOARD_USER:-abdo1}', $script);
        $this->assertStringContainsString('BACKEND_DIR=${BACKEND_DIR:-/home/abdo2/htdocs/api.zdraft.tech}', $script);
        $this->assertStringContainsString('BACKEND_USER=${BACKEND_USER:-abdo2}', $script);
    }

    public function test_orchestrator_has_no_legacy_single_root_or_seeded_backend_deploy(): void
    {
        $root = dirname(__DIR__, 3);
        $script = file_get_contents($root.'/ops/deploy-zdraft.sh');

        $this->assertStringNotContainsString('/var/www/zdraft', $script);
        $this->assertStringNotContainsString('ROOT_DIR=', $script);
        $this->assertStringNotContainsString('migrate --seed --force', $script);
        $this->assertStringNotContainsString('php artisan migrate --seed', $script);
    }

    public function test_orchestrator_delegates_backend_to_backend_only_deploy_with_scheduler(): void
    {
        $root = dirname(__DIR__, 3);
        $script = file_get_contents($root.'/ops/deploy-zdraft.sh');
        $backendDeploy = file_get_contents($root.'/backend/deploy/scripts/deploy-vps.sh');

        $this->assertStringContainsString('bash "${BACKEND_DIR}/deploy/scripts/deploy-vps.sh"', $script);
        $this->assertStringContainsString('APP_USER="${BACKEND_USER}"', $script);
        $this->assertStringContainsString('APP_GROUP="${BACKEND_GROUP}"', $script);
        $this->assertStringContainsString('systemctl enable --now zdraft-laravel-scheduler.service', $backendDeploy);
        $this->assertStringContainsString('systemctl restart zdraft-laravel-scheduler.service', $backendDeploy);
        $this->assertStringContainsString('systemctl is-active --quiet zdraft-laravel-scheduler.service', $backendDeploy);
    }

    public function test_backend_deploy_remains_backend_only(): void
    {
        $root = dirname(__DIR__, 3);
        $backendDeploy = file_get_contents($root.'/backend/deploy/scripts/deploy-vps.sh');

        $this->assertStringNotContainsString('cd "${ROOT_DIR}"', $backendDeploy);
        $this->assertStringNotContainsString('npm install', $backendDeploy);
        $this->assertStringNotContainsString('npm run build:engine', $backendDeploy);
        $this->assertStringNotContainsString('npm --workspace frontend run build', $backendDeploy);
        $this->assertStringNotContainsString('npm --workspace zdraft-dashboard run build', $backendDeploy);
        $this->assertStringNotContainsString('systemctl restart zdraft-frontend.service', $backendDeploy);
        $this->assertStringNotContainsString('systemctl restart zdraft-dashboard.service', $backendDeploy);
    }
}
