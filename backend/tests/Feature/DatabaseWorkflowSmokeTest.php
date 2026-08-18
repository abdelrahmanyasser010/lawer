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
        $this->withCredentials();
        $this->disableCookieEncryption();
    }

    public function test_registration_otp_catalog_and_service_request_flow(): void
    {
        $auth = $this->registerAndVerifyClient();

        $auth->getJson('/api/v1/catalog')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'data.templates');

        $auth->getJson('/api/v1/dashboard/summary')
            ->assertStatus(401); // assertJsonPath('code', 'FORBIDDEN') for unprivileged access

        $slotKey = $this->ensureConsultationSchedule();

        $created = $auth->postJson('/api/v1/service-requests', [
            'requestType' => 'consultation',
            'title' => 'استشارة اختبار الربط',
            'description' => 'هذا طلب اختبار تكامل لقاعدة البيانات وواجهات Laravel.',
            'communicationChannel' => 'whatsapp',
            'availabilitySlotKey' => $slotKey,
            'paymentRequired' => false,
        ]);
        $created->assertCreated()->assertJsonPath('data.status', fn ($s) => in_array($s, ['new', 'awaiting_payment'], true));
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
        $slotKey = $this->ensureConsultationSchedule();

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
            'availabilitySlotKey' => $slotKey,
            'paymentRequired' => false,
        ])->assertUnprocessable();

        foreach (['zoom', 'whatsapp'] as $channel) {
            $created = $auth->postJson('/api/v1/service-requests', [
                'requestType' => 'consultation',
                'title' => 'استشارة اختبار '.$channel,
                'description' => 'اختبار قناة التواصل المسموح بها في الاستشارة القانونية.',
                'communicationChannel' => $channel,
                'availabilitySlotKey' => $slotKey,
                'paymentRequired' => false,
            ]);
            $created->assertCreated();
            $id = (int) $created->json('data.id');
            $auth->getJson('/api/v1/service-requests/'.$id)
                ->assertOk()
                ->assertJsonPath('data.communicationChannel', $channel);
        }
    }

    public function test_payment_receipt_history_and_notification_flow(): void
    {
        $auth = $this->registerAndVerifyClient();
        $slotKey = $this->ensureConsultationSchedule();
        $profile = $auth->getJson('/api/v1/users/profile')->assertOk()->json('data');
        $userId = (int) $profile['id'];

        $created = $auth->postJson('/api/v1/service-requests', [
            'requestType' => 'consultation',
            'title' => 'استشارة مدفوعة لاختبار الإيصال',
            'description' => 'اختبار حفظ إيصال الدفع والسجل والإشعار داخل Laravel.',
            'communicationChannel' => 'whatsapp',
            'availabilitySlotKey' => $slotKey,
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

        $login = $this->withHeader('Origin', config('zdraft.dashboard_url'))->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => $password,
        ]);
        $login->assertOk()->assertJsonPath('data.user.roles.0', 'super_admin');

        $session = $login->getCookie(config('zdraft.dashboard_session_cookie'), false)?->getValue();
        $csrf = $login->getCookie(config('zdraft.dashboard_csrf_cookie'), false)?->getValue();
        $this->defaultCookies = [
            (string) config('zdraft.dashboard_session_cookie') => $session,
            (string) config('zdraft.dashboard_csrf_cookie') => $csrf,
        ];
        $this->defaultHeaders = [
            'X-CSRF-Token' => $csrf,
            'Origin' => (string) config('zdraft.dashboard_url'),
        ];

        $this->getJson('/api/v1/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('success', true);
        $this->getJson('/api/v1/admin/reports/overview?period=month')
            ->assertOk()
            ->assertJsonPath('data.period', 'month')
            ->assertJsonStructure(['data' => ['metrics', 'revenueSeries', 'templateDistribution', 'serviceDistribution']]);
        $this->getJson('/api/v1/admin/reports/customer-export?period=month')
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

        DB::table('contracts')->where('id', $contractId)->update(['billing_mode' => 'office_waiver']);

        $share = $this->postJson('/api/v1/contracts/'.$contractId.'/shares', [
            'permission' => 'view_only',
            'expiresInDays' => 2,
        ]);
        $share->assertCreated()->assertJsonPath('data.permission', 'view_only');
        $shareId = (int) $share->json('data.id');
        $token = (string) $share->json('data.token');
        $this->assertNotSame('', $token);

        $savedCookies = $this->defaultCookies;
        $savedHeaders = $this->defaultHeaders;
        $this->defaultCookies = [];
        $this->defaultHeaders = [];

        $this->getJson('/api/v1/contracts/shared/'.$token)
            ->assertOk()
            ->assertJsonPath('data.serialNumber', $serial)
            ->assertJsonPath('data.permission', 'view_only');
        $this->postJson('/api/v1/contracts/shared/'.$token.'/access', [])
            ->assertOk()
            ->assertJsonPath('data.contractId', $contractId);

        $this->defaultCookies = $savedCookies;
        $this->defaultHeaders = $savedHeaders;

        $this->deleteJson('/api/v1/contracts/'.$contractId.'/shares/'.$shareId)
            ->assertOk()
            ->assertJsonPath('data.revoked', true);
    }

    private function registerAndVerifyClient(): self
    {
        $this->defaultCookies = [];
        $this->defaultHeaders = [];
        $email = 'workflow+'.bin2hex(random_bytes(5)).'@example.test';
        $register = $this->postJson('/api/v1/auth/register', [
            'fullName' => 'عميل اختبار',
            'email' => $email,
            'password' => 'StrongPass123',
            'accountType' => 'individual',
            'agreedToTerms' => true,
        ]);
        $register->assertCreated()->assertJsonPath('data.verificationRequired', true);

        $session = $register->getCookie(config('zdraft.frontend_session_cookie'), false)?->getValue();
        $csrf = $register->getCookie(config('zdraft.frontend_csrf_cookie'), false)?->getValue();
        $code = $register->json('data.debugVerificationCode');
        $this->defaultCookies = [
            (string) config('zdraft.frontend_session_cookie') => $session,
            (string) config('zdraft.frontend_csrf_cookie') => $csrf,
        ];
        $this->defaultHeaders = [
            'X-CSRF-Token' => $csrf,
        ];

        $this->postJson('/api/v1/auth/email-verification/verify', ['code' => $code])
            ->assertOk()
            ->assertJsonPath('data.verified', true);

        $this->getJson('/api/v1/auth/sessions')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.current', true);
        $this->getJson('/api/v1/users/profile')
            ->assertOk()
            ->assertJsonPath('data.email', $email)
            ->assertJsonPath('data.emailVerifiedAt', fn ($value) => !empty($value));

        return $this;
    }

    private function ensureConsultationSchedule(): string
    {
        if (!DB::table('consultation_schedule_windows')->where('is_active', true)->exists()) {
            for ($day = 0; $day <= 6; $day++) {
                DB::table('consultation_schedule_windows')->insert([
                    'weekday' => $day,
                    'start_time' => '09:00:00',
                    'end_time' => '17:00:00',
                    'slot_minutes' => 60,
                    'total_capacity' => 5,
                    'zoom_capacity' => 3,
                    'whatsapp_capacity' => 3,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
        $avail = $this->getJson('/api/v1/consultation-availability')->json('data');
        foreach ($avail['days'] ?? [] as $day) {
            foreach ($day['slots'] ?? [] as $slot) {
                if (!empty($slot['slotKey']) && ($slot['available'] ?? false)) {
                    return (string) $slot['slotKey'];
                }
            }
        }
        return now()->addDays(1)->format('Y-m-d').'_10:00';
    }
}
