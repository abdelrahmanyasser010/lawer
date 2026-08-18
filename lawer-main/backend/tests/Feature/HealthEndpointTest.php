<?php
namespace Tests\Feature;
use Tests\TestCase;
final class HealthEndpointTest extends TestCase
{
    public function test_api_health_endpoint_and_security_headers(): void
    {
        $response=$this->withHeader('Origin','http://localhost:3000')->getJson('/api/health');
        $response->assertOk()->assertJsonPath('status','ok');
        $response->assertHeader('Access-Control-Allow-Origin','http://localhost:3000');
        $response->assertHeader('X-Content-Type-Options','nosniff');
        $response->assertHeader('X-Frame-Options','DENY');
    }
    public function test_preflight_and_error_responses_keep_cors_headers(): void
    {
        $origin = 'http://localhost:3000';
        $this->withHeaders([
            'Origin' => $origin,
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'content-type,x-csrf-token',
        ])->options('/api/v1/auth/login')
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', $origin)
            ->assertHeader('Access-Control-Allow-Credentials', 'true');

        $this->withHeader('Origin', $origin)
            ->getJson('/api/v1/route-that-does-not-exist')
            ->assertNotFound()
            ->assertJsonPath('code', 'ROUTE_NOT_FOUND')
            ->assertHeader('Access-Control-Allow-Origin', $origin)
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

}
