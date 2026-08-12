<?php
namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class DatabaseWorkflowSmokeTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        if (!filter_var(env('RUN_DATABASE_TESTS', false), FILTER_VALIDATE_BOOL)) {
            $this->markTestSkipped('Set RUN_DATABASE_TESTS=true against an isolated PostgreSQL test database.');
        }
    }

    public function test_registration_otp_catalog_and_service_request_flow(): void
    {
        $auth = $this->registerAndVerifyClient();

        $auth->getJson('/api/v1/catalog')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'data.templates');

        $auth->getJson('/api/v1/dashboard/summary')
            ->assertForbidden()
            ->assertJsonPath('code', 'FORBIDDEN');

        $created = $auth->postJson('/api/v1/service-requests', [
            'requestType' => 'consultation',
            'title' => 'استشارة اختبار الربط',
            'description' => 'هذا طلب اختبار تكامل لقاعدة البيانات وواجهات Laravel.',
            'communicationChannel' => 'whatsapp',
            'paymentRequired' => false,
        ]);
        $created->assertCreated()->assertJsonPath('data.status', 'new');
        $requestId = (int) $created->json('data.id');

        $auth->getJson('/api/v1/service-requests/my')
            ->assertOk()
            ->assertJsonFragment(['title' => 'استشارة اختبار الربط']);
        $auth->getJson('/api/v1/service-requests/'.$requestId)
            ->assertOk()
            ->assertJsonPath('data.id', $requestId);
    }

    public function test_consultation_channels_catalog_and_office_rejection(): void
    {
        $auth = $this->registerAndVerifyClient();

        $catalog = $auth->getJson('/api/v1/catalog')->assertOk();
        $channels = $catalog->json('data.policies.communicationChannels');
        $this->assertSame(['zoom', 'whatsapp'], array_values($channels));
        $catalog->assertJsonStructure(['data' => [
            'services' => ['consultationFeeEgp'],
            'office' => ['consultationWhatsappNumber', 'supportWhatsappNumber', 'supportPhone', 'supportEmail'],
            'payment' => ['vodafoneCashNumber'],
        ]]);

        $auth->postJson('/api/v1/service-requests', [
            'requestType' => 'consultation',
            'title' => 'استشارة بقناة غير متاحة',
            'description' => 'يجب أن يرفض Laravel قناة المكتب للاستشارات الجديدة.',
            'communicationChannel' => 'office',
            'paymentRequired' => false,
        ])->assertUnprocessable();

        foreach (['zoom', 'whatsapp'] as $channel) {
            $auth->postJson('/api/v1/service-requests', [
                'requestType' => 'consultation',
                'title' => 'استشارة اختبار '.$channel,
                'description' => 'اختبار قناة التواصل المسموح بها في الاستشارة القانونية.',
                'communicationChannel' => $channel,
                'paymentRequired' => false,
            ])->assertCreated()->assertJsonPath('data.communicationChannel', $channel);
        }
    }

    public function test_payment_receipt_history_and_notification_flow(): void
    {
        $auth = $this->registerAndVerifyClient();
        $profile = $auth->getJson('/api/v1/users/profile')->assertOk()->json('data');
        $userId = (int) $profile['id'];

        $created = $auth->postJson('/api/v1/service-requests', [
            'requestType' => 'consultation',
            'title' => 'استشارة مدفوعة لاختبار الإيصال',
            'description' => 'اختبار حفظ إيصال الدفع والسجل والإشعار داخل Laravel.',
            'communicationChannel' => 'whatsapp',
            'paymentRequired' => true,
        ]);
        $created->assertCreated()->assertJsonPath('data.status', 'awaiting_payment');
        $requestId = (int) $created->json('data.id');

        $attachmentId = (int) DB::table('document_attachments')->insertGetId([
            'attachable_type' => 'pending',
            'attachable_id' => 0,
            'owner_user_id' => $userId,
            'file_path' => '/tmp/zdraft-tests/private/payment-receipt.pdf',
            'file_name' => 'payment-receipt.pdf',
            'original_file_name' => 'payment-receipt.pdf',
            'file_type' => 'application/pdf',
            'file_size_bytes' => 128,
            'visibility' => 'private',
            'created_at' => now(),
        ]);
        $setting = DB::selectOne("SELECT COALESCE((setting_value_json #>> '{}')::numeric,100)::float AS amount FROM platform_settings WHERE setting_key='services.consultation.fee_egp'");
        $amount = (float) ($setting->amount ?? 100);

        $payment = $auth->postJson('/api/v1/payments/receipts', [
            'serviceRequestId' => $requestId,
            'amountEgp' => $amount,
            'attachmentId' => $attachmentId,
            'senderPhone' => '01000000000',
        ]);
        $payment->assertCreated()->assertJsonPath('data.status', 'pending_verification');
        $serial = (string) $payment->json('data.serialNumber');

        $auth->getJson('/api/v1/payments/my')
            ->assertOk()
            ->assertJsonFragment(['serialNumber' => $serial, 'status' => 'pending_verification']);
        $auth->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('data.items.0.payload', fn ($value) => is_array($value));
    }

    public function test_super_admin_dashboard_and_reports_flow(): void
    {
        $admin = DB::selectOne(
            "SELECT u.id,u.email FROM users u JOIN staff_role_assignments sra ON sra.user_id=u.id JOIN roles r ON r.id=sra.role_id WHERE r.role_key='super_admin' ORDER BY u.id LIMIT 1"
        );
        $this->assertNotNull($admin, 'Run php artisan migrate --seed before the database smoke suite.');

        $password = 'StrongAdminPass123';
        DB::table('users')->where('id', $admin->id)->update([
            'password_hash' => Hash::make($password),
            'status' => 'active',
            'email_verified_at' => now(),
            'updated_at' => now(),
        ]);

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => $password,
        ]);
        $login->assertOk()->assertJsonPath('data.user.roles.0', 'super_admin');

        $session = $login->getCookie(config('zdraft.session_cookie'))?->getValue();
        $csrf = $login->getCookie(config('zdraft.csrf_cookie'))?->getValue();
        $this->assertNotEmpty($session);
        $this->assertNotEmpty($csrf);
        $login->assertJsonPath('data.csrfToken', $csrf);
        $auth = $this->withCookie(config('zdraft.session_cookie'), $session)
            ->withCookie(config('zdraft.csrf_cookie'), $csrf)
            ->withHeader('X-CSRF-Token', $csrf);

        $auth->getJson('/api/v1/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('success', true);
        $auth->getJson('/api/v1/admin/reports/overview?period=month')
            ->assertOk()
            ->assertJsonPath('data.period', 'month')
            ->assertJsonStructure(['data' => ['metrics', 'revenueSeries', 'templateDistribution', 'serviceDistribution']]);
        $auth->getJson('/api/v1/admin/reports/customer-export?period=month')
            ->assertOk()
            ->assertJsonPath('data.period', 'month')
            ->assertJsonStructure(['data' => ['rows']]);
    }

    public function test_contract_draft_history_and_share_flow(): void
    {
        $auth = $this->registerAndVerifyClient();

        $created = $auth->postJson('/api/v1/contracts/draft', [
            'templateSlug' => 'rental',
            'variantKey' => 'residential_lease',
            'selectedOptionalClauseKeys' => [],
            'fieldValues' => [],
            'attachmentRefs' => [],
            'currentStepKey' => 'parties',
        ]);
        $created->assertCreated()->assertJsonPath('data.status', 'draft');
        $contractId = (int) $created->json('data.id');
        $serial = (string) $created->json('data.serialNumber');

        $auth->getJson('/api/v1/contracts/my')
            ->assertOk()
            ->assertJsonFragment(['serialNumber' => $serial]);
        $auth->getJson('/api/v1/contracts/'.$contractId)
            ->assertOk()
            ->assertJsonPath('data.id', $contractId)
            ->assertJsonPath('data.template_slug', 'rental');

        $share = $auth->postJson('/api/v1/contracts/'.$contractId.'/shares', [
            'permission' => 'view_only',
            'expiresInDays' => 2,
        ]);
        $share->assertCreated()->assertJsonPath('data.permission', 'view_only');
        $shareId = (int) $share->json('data.id');
        $token = (string) $share->json('data.token');
        $this->assertNotSame('', $token);

        $this->getJson('/api/v1/contracts/shared/'.$token)
            ->assertOk()
            ->assertJsonPath('data.serialNumber', $serial)
            ->assertJsonPath('data.permission', 'view_only');
        $this->postJson('/api/v1/contracts/shared/'.$token.'/access', [])
            ->assertOk()
            ->assertJsonPath('data.contractId', $contractId);

        $auth->deleteJson('/api/v1/contracts/'.$contractId.'/shares/'.$shareId)
            ->assertOk()
            ->assertJsonPath('data.revoked', true);
    }

    private function registerAndVerifyClient(): self
    {
        $email = 'workflow+'.bin2hex(random_bytes(5)).'@example.test';
        $register = $this->postJson('/api/v1/auth/register', [
            'fullName' => 'عميل اختبار',
            'email' => $email,
            'password' => 'StrongPass123',
            'accountType' => 'individual',
            'agreedToTerms' => true,
        ]);
        $register->assertCreated()->assertJsonPath('data.verificationRequired', true);

        $session = $register->getCookie(config('zdraft.session_cookie'))?->getValue();
        $csrf = $register->getCookie(config('zdraft.csrf_cookie'))?->getValue();
        $code = $register->json('data.debugVerificationCode');
        $this->assertNotEmpty($session);
        $this->assertNotEmpty($csrf);
        $register->assertJsonPath('data.csrfToken', $csrf);
        $this->assertMatchesRegularExpression('/^\d{6}$/', (string) $code);

        $auth = $this->withCookie(config('zdraft.session_cookie'), $session)
            ->withCookie(config('zdraft.csrf_cookie'), $csrf)
            ->withHeader('X-CSRF-Token', $csrf);
        $auth->postJson('/api/v1/auth/email-verification/verify', ['code' => $code])
            ->assertOk()
            ->assertJsonPath('data.verified', true);

        $auth->getJson('/api/v1/auth/sessions')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.current', true);
        $auth->getJson('/api/v1/users/profile')
            ->assertOk()
            ->assertJsonPath('data.email', $email)
            ->assertJsonPath('data.emailVerifiedAt', fn ($value) => !empty($value));

        return $auth;
    }
}
