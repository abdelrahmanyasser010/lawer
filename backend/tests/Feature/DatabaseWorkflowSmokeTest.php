<?php
namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

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
        $this->setSetting('services.contract_review.fee_egp', 300);
        $this->setSetting('services.contract_review.deposit_egp', 100);
        $auth = $this->registerAndVerifyClient();
        $profile = $auth->getJson('/api/v1/users/profile')->assertOk()->json('data');
        $userId = (int) $profile['id'];

        $auth->getJson('/api/v1/catalog')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'data.templates');

        $auth->getJson('/api/v1/dashboard/summary')
            ->assertForbidden()
            ->assertJsonPath('code', 'FORBIDDEN');

        $slot = $this->firstAvailableSlot($auth, 'whatsapp');
        $sourceAttachment = $this->createPendingAttachment($userId, 'review-source.pdf');
        $created = $auth->postJson('/api/v1/service-requests', [
            'requestType' => 'contract_review',
            'title' => 'مراجعة عقد لاختبار الربط',
            'description' => 'هذا طلب اختبار تكامل لمراجعة عقد من خلال Laravel وقاعدة البيانات.',
            'communicationChannel' => 'whatsapp',
            'availabilitySlotKey' => $slot['slotKey'],
            'attachmentIds' => [$sourceAttachment],
        ]);
        $created->assertCreated()
            ->assertJsonPath('data.status', 'awaiting_payment')
            ->assertJsonPath('data.paymentAmountEgp', 100)
            ->assertJsonPath('data.totalPriceEgp', 300);
        $requestId = (int) $created->json('data.id');

        $auth->getJson('/api/v1/service-requests/my')
            ->assertOk()
            ->assertJsonFragment(['title' => 'مراجعة عقد لاختبار الربط']);
        $auth->getJson('/api/v1/service-requests/'.$requestId)
            ->assertOk()
            ->assertJsonPath('data.id', $requestId)
            ->assertJsonPath('data.requestType', 'contract_review')
            ->assertJsonPath('data.status', 'awaiting_payment')
            ->assertJsonPath('data.bookingStatus', 'pending_payment')
            ->assertJsonPath('data.expectedPaymentEgp', 100);
    }

    public function test_review_channels_catalog_and_payment_instructions_gate(): void
    {
        $this->setSetting('payments.vodafone_cash_number', '01012345678');
        $this->setSetting('services.contract_review.fee_egp', 300);
        $this->setSetting('services.contract_review.deposit_egp', 100);
        $auth = $this->registerAndVerifyClient();
        $profile = $auth->getJson('/api/v1/users/profile')->assertOk()->json('data');
        $userId = (int) $profile['id'];

        $catalog = $auth->getJson('/api/v1/catalog')->assertOk();
        $channels = $catalog->json('data.policies.communicationChannels');
        $this->assertSame(['zoom', 'whatsapp'], array_values($channels));
        $catalog->assertJsonStructure(['data' => [
            'services' => ['contractReviewFeeEgp', 'contractReviewDepositEgp', 'contractDraftingDepositEgp'],
            'office' => ['reviewWhatsappNumber', 'supportWhatsappNumber', 'supportPhone', 'supportEmail'],
            'payment' => ['vodafoneCashNumber'],
        ]]);
        $catalog->assertJsonMissingPath('data.services.consultationFeeEgp');
        $catalog->assertJsonPath('data.payment.vodafoneCashNumber', '');

        $auth->getJson('/api/v1/payments/instructions')
            ->assertOk()
            ->assertJsonPath('data.vodafoneCashNumber', '01012345678');

        $auth->postJson('/api/v1/service-requests', [
            'requestType' => 'contract_review',
            'title' => 'مراجعة بقناة غير متاحة',
            'description' => 'يجب أن يرفض Laravel قناة المكتب لطلبات مراجعة العقود.',
            'communicationChannel' => 'office',
            'availabilitySlotKey' => 'invalid',
        ])->assertUnprocessable();

        foreach (['zoom', 'whatsapp'] as $channel) {
            $slot = $this->firstAvailableSlot($auth, $channel);
            $sourceAttachment = $this->createPendingAttachment($userId, 'review-'.$channel.'.pdf');
            $auth->postJson('/api/v1/service-requests', [
                'requestType' => 'contract_review',
                'title' => 'مراجعة عقد عبر '.$channel,
                'description' => 'اختبار قناة التواصل المسموح بها لمناقشة تقرير مراجعة العقد.',
                'communicationChannel' => $channel,
                'availabilitySlotKey' => $slot['slotKey'],
                'attachmentIds' => [$sourceAttachment],
            ])->assertCreated()
                ->assertJsonPath('data.status', 'awaiting_payment');
        }
    }

    public function test_payment_receipt_history_and_notification_flow(): void
    {
        $this->setSetting('services.contract_review.fee_egp', 300);
        $this->setSetting('services.contract_review.deposit_egp', 100);
        $auth = $this->registerAndVerifyClient();
        $profile = $auth->getJson('/api/v1/users/profile')->assertOk()->json('data');
        $userId = (int) $profile['id'];
        $slot = $this->firstAvailableSlot($auth, 'whatsapp');
        $sourceAttachment = $this->createPendingAttachment($userId, 'review-payment-source.pdf');

        $created = $auth->postJson('/api/v1/service-requests', [
            'requestType' => 'contract_review',
            'title' => 'مراجعة عقد لاختبار الإيصال',
            'description' => 'اختبار حفظ إيصال عربون مراجعة العقد والسجل والإشعار داخل Laravel.',
            'communicationChannel' => 'whatsapp',
            'availabilitySlotKey' => $slot['slotKey'],
            'attachmentIds' => [$sourceAttachment],
        ]);
        $created->assertCreated()->assertJsonPath('data.status', 'awaiting_payment');
        $requestId = (int) $created->json('data.id');
        $amount = (float) $created->json('data.paymentAmountEgp');

        $attachmentId = $this->createPendingAttachment($userId, 'payment-receipt.pdf');
        $payment = $auth->postJson('/api/v1/payments/receipts', [
            'serviceRequestId' => $requestId,
            'amountEgp' => $amount,
            'attachmentId' => $attachmentId,
            'senderPhone' => '01000000000',
        ]);
        $payment->assertCreated()->assertJsonPath('data.status', 'pending_verification');
        $serial = (string) $payment->json('data.serialNumber');

        $auth->getJson('/api/v1/service-requests/'.$requestId)
            ->assertOk()
            ->assertJsonPath('data.bookingStatus', 'pending_verification');
        $auth->getJson('/api/v1/payments/my')
            ->assertOk()
            ->assertJsonFragment(['serialNumber' => $serial, 'status' => 'pending_verification']);
        $auth->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('data.items.0.payload', fn ($value) => is_array($value));
    }

    public function test_contract_review_client_admin_payment_lifecycle(): void
    {
        $this->setSetting('services.contract_review.fee_egp', 500);
        $this->setSetting('services.contract_review.deposit_egp', 200);

        $client = $this->registerAndVerifyClient();
        $clientProfile = $client->getJson('/api/v1/users/profile')->assertOk()->json('data');
        $clientId = (int) $clientProfile['id'];
        $admin = $this->loginSuperAdmin();
        $adminAuth = $admin['auth'];
        $adminId = (int) $admin['id'];

        $sourceContractAttachment = $this->createPendingAttachment($clientId, 'contract-to-review.pdf');
        $slot = $this->firstAvailableSlot($client, 'whatsapp');
        $created = $client->postJson('/api/v1/service-requests', [
            'requestType' => 'contract_review',
            'title' => 'مراجعة عقد دورة كاملة',
            'description' => 'مراجعة عقد لاختبار العربون والمتبقي والمخرجات واعتماد العميل.',
            'communicationChannel' => 'whatsapp',
            'availabilitySlotKey' => $slot['slotKey'],
            'attachmentIds' => [$sourceContractAttachment],
        ]);
        $created->assertCreated()
            ->assertJsonPath('data.status', 'awaiting_payment')
            ->assertJsonPath('data.paymentAmountEgp', 200)
            ->assertJsonPath('data.totalPriceEgp', 500)
            ->assertJsonPath('data.remainingEgp', 300);
        $requestId = (int) $created->json('data.id');

        $depositReceipt = $this->createPendingAttachment($clientId, 'review-deposit.pdf');
        $deposit = $client->postJson('/api/v1/payments/receipts', [
            'serviceRequestId' => $requestId,
            'amountEgp' => 200,
            'attachmentId' => $depositReceipt,
            'senderPhone' => '01000000000',
        ])->assertCreated();
        $depositPaymentId = (int) $deposit->json('data.id');

        $adminAuth->postJson('/api/v1/admin/payments/'.$depositPaymentId.'/approve', [
            'notes' => 'تم اعتماد عربون المراجعة',
        ])->assertOk()->assertJsonPath('data.status', 'approved');

        $client->getJson('/api/v1/service-requests/'.$requestId)
            ->assertOk()
            ->assertJsonPath('data.requestType', 'contract_review')
            ->assertJsonPath('data.status', 'new')
            ->assertJsonPath('data.bookingStatus', 'confirmed')
            ->assertJsonPath('data.approvedPaidEgp', 200)
            ->assertJsonPath('data.outstandingEgp', 300)
            ->assertJsonPath('data.paymentStage', 'working');

        $adminAuth->postJson('/api/v1/admin/service-requests/'.$requestId.'/status', [
            'status' => 'in_progress',
            'notes' => 'بدأت المراجعة القانونية',
            'visibleToClient' => true,
        ])->assertOk()->assertJsonPath('data.status', 'in_progress');

        $reportAttachment = $this->createPendingAttachment($adminId, 'review-report-final.pdf');
        $adminAuth->postJson('/api/v1/admin/service-requests/'.$requestId.'/deliverables', [
            'attachmentId' => $reportAttachment,
            'type' => 'final_document',
            'title' => 'تقرير مراجعة العقد النهائي',
            'notes' => 'اكتملت المراجعة وأصبح المتبقي مستحقًا.',
            'isFinal' => true,
        ])->assertCreated()
            ->assertJsonPath('data.status', 'awaiting_payment')
            ->assertJsonPath('data.paymentDueEgp', 300);

        $client->getJson('/api/v1/service-requests/'.$requestId)
            ->assertOk()
            ->assertJsonPath('data.status', 'awaiting_payment')
            ->assertJsonPath('data.paymentStage', 'balance')
            ->assertJsonPath('data.expectedPaymentEgp', 300)
            ->assertJsonPath('data.deliverables', fn ($items) => is_array($items) && count($items) === 0);

        $balanceReceipt = $this->createPendingAttachment($clientId, 'review-balance.pdf');
        $balance = $client->postJson('/api/v1/payments/receipts', [
            'serviceRequestId' => $requestId,
            'amountEgp' => 300,
            'attachmentId' => $balanceReceipt,
            'senderPhone' => '01000000000',
        ])->assertCreated();
        $balancePaymentId = (int) $balance->json('data.id');

        $adminAuth->postJson('/api/v1/admin/payments/'.$balancePaymentId.'/approve', [
            'notes' => 'تم اعتماد المبلغ المتبقي',
        ])->assertOk()->assertJsonPath('data.status', 'approved');

        $client->getJson('/api/v1/service-requests/'.$requestId)
            ->assertOk()
            ->assertJsonPath('data.status', 'client_review')
            ->assertJsonPath('data.approvedPaidEgp', 500)
            ->assertJsonPath('data.outstandingEgp', 0)
            ->assertJsonPath('data.paymentStage', 'paid')
            ->assertJsonPath('data.permissions.canConfirmReceipt', true)
            ->assertJsonPath('data.deliverables', fn ($items) => is_array($items) && count($items) === 1);

        $client->postJson('/api/v1/service-requests/'.$requestId.'/confirm-receipt')
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');

        $adminAuth->postJson('/api/v1/admin/service-requests/'.$requestId.'/status', [
            'status' => 'new',
        ])->assertStatus(409)
            ->assertJsonPath('code', 'INVALID_SERVICE_REQUEST_STATUS_TRANSITION');
    }

    public function test_expired_booking_persists_and_client_can_rebook_before_payment(): void
    {
        $this->setSetting('services.contract_review.fee_egp', 300);
        $this->setSetting('services.contract_review.deposit_egp', 100);
        $client = $this->registerAndVerifyClient();
        $profile = $client->getJson('/api/v1/users/profile')->assertOk()->json('data');
        $clientId = (int) $profile['id'];
        $slot = $this->firstAvailableSlot($client, 'whatsapp');
        $sourceAttachment = $this->createPendingAttachment($clientId, 'expired-booking-source.pdf');

        $created = $client->postJson('/api/v1/service-requests', [
            'requestType' => 'contract_review',
            'title' => 'مراجعة عقد مع انتهاء مهلة الحجز',
            'description' => 'اختبار تثبيت حالة انتهاء حجز مناقشة المراجعة ثم السماح للعميل باختيار موعد جديد.',
            'communicationChannel' => 'whatsapp',
            'availabilitySlotKey' => $slot['slotKey'],
            'attachmentIds' => [$sourceAttachment],
        ])->assertCreated();
        $requestId = (int) $created->json('data.id');

        DB::table('consultation_bookings')->where('service_request_id', $requestId)->update([
            'expires_at' => now()->subMinute(),
            'status' => 'pending_payment',
            'updated_at' => now(),
        ]);

        $receiptAttachment = $this->createPendingAttachment($clientId, 'expired-booking-receipt.pdf');
        $client->postJson('/api/v1/payments/receipts', [
            'serviceRequestId' => $requestId,
            'amountEgp' => 100,
            'attachmentId' => $receiptAttachment,
            'senderPhone' => '01000000000',
        ])->assertStatus(409)
            ->assertJsonPath('code', 'BOOKING_EXPIRED');

        $this->assertSame('expired', DB::table('consultation_bookings')->where('service_request_id', $requestId)->value('status'));
        $this->assertNull(DB::table('consultation_bookings')->where('service_request_id', $requestId)->value('expires_at'));

        $newSlot = $this->firstAvailableSlot($client, 'whatsapp');
        $client->postJson('/api/v1/service-requests/'.$requestId.'/rebook', [
            'communicationChannel' => 'whatsapp',
            'availabilitySlotKey' => $newSlot['slotKey'],
        ])->assertOk();

        $client->getJson('/api/v1/service-requests/'.$requestId)
            ->assertOk()
            ->assertJsonPath('data.status', 'awaiting_payment')
            ->assertJsonPath('data.bookingStatus', 'pending_payment')
            ->assertJsonPath('data.bookingExpiresAt', fn ($value) => !empty($value));

        $client->postJson('/api/v1/payments/receipts', [
            'serviceRequestId' => $requestId,
            'amountEgp' => 100,
            'attachmentId' => $receiptAttachment,
            'senderPhone' => '01000000000',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending_verification');
    }

    public function test_payment_approval_cannot_revive_cancelled_service_request(): void
    {
        $this->setSetting('services.contract_review.fee_egp', 300);
        $this->setSetting('services.contract_review.deposit_egp', 100);
        $client = $this->registerAndVerifyClient();
        $profile = $client->getJson('/api/v1/users/profile')->assertOk()->json('data');
        $clientId = (int) $profile['id'];
        $admin = $this->loginSuperAdmin();
        $adminAuth = $admin['auth'];
        $slot = $this->firstAvailableSlot($client, 'whatsapp');
        $sourceAttachment = $this->createPendingAttachment($clientId, 'cancelled-request-source.pdf');

        $created = $client->postJson('/api/v1/service-requests', [
            'requestType' => 'contract_review',
            'title' => 'مراجعة عقد ستلغى بعد رفع الإيصال',
            'description' => 'اختبار منع اعتماد إيصال قديم من إعادة إحياء طلب تم إلغاؤه.',
            'communicationChannel' => 'whatsapp',
            'availabilitySlotKey' => $slot['slotKey'],
            'attachmentIds' => [$sourceAttachment],
        ])->assertCreated();
        $requestId = (int) $created->json('data.id');

        $receiptAttachment = $this->createPendingAttachment($clientId, 'cancelled-request-receipt.pdf');
        $payment = $client->postJson('/api/v1/payments/receipts', [
            'serviceRequestId' => $requestId,
            'amountEgp' => 100,
            'attachmentId' => $receiptAttachment,
            'senderPhone' => '01000000000',
        ])->assertCreated();
        $paymentId = (int) $payment->json('data.id');

        $adminAuth->postJson('/api/v1/admin/service-requests/'.$requestId.'/status', [
            'status' => 'cancelled',
            'notes' => 'ألغي الطلب قبل مراجعة الإيصال',
            'visibleToClient' => true,
        ])->assertOk()->assertJsonPath('data.status', 'cancelled');

        $adminAuth->postJson('/api/v1/admin/payments/'.$paymentId.'/approve', [
            'notes' => 'محاولة اعتماد بعد الإلغاء',
        ])->assertStatus(409)
            ->assertJsonPath('code', 'PAYMENT_TARGET_STATE_CHANGED');

        $this->assertSame('pending_verification', DB::table('payments')->where('id', $paymentId)->value('status'));
        $this->assertSame('cancelled', DB::table('service_requests')->where('id', $requestId)->value('status'));
    }

    public function test_super_admin_dashboard_and_reports_flow(): void
    {
        $admin = $this->loginSuperAdmin();
        $auth = $admin['auth'];

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

    public function test_contract_share_is_blocked_before_payment(): void
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
        $detail = $auth->getJson('/api/v1/contracts/'.$contractId)
            ->assertOk()
            ->assertJsonPath('data.id', $contractId)
            ->assertJsonPath('data.template_slug', 'rental')
            ->assertJsonPath('data.permissions.canShare', false);
        $versionId = (int) $detail->json('data.current_version_id');

        $admin = $this->loginSuperAdmin();
        $preview = $admin['auth']->getJson('/api/v1/admin/contracts/'.$contractId.'/versions/'.$versionId.'/preview')
            ->assertOk()
            ->assertJsonPath('data.contractId', $contractId)
            ->assertJsonPath('data.versionId', $versionId)
            ->assertJsonPath('data.versionNumber', 1);
        $this->assertSame('rental', $preview->json('data.templateSlug'));

        $auth->postJson('/api/v1/contracts/'.$contractId.'/shares', [
            'permission' => 'view_only',
            'expiresInDays' => 2,
        ])->assertStatus(402)
            ->assertJsonPath('code', 'PAYMENT_REQUIRED_FOR_OUTPUT');

        $this->getJson('/api/v1/contracts/shared/invalid-workflow-test-token')
            ->assertNotFound();
    }

    private function firstAvailableSlot(self $auth, string $channel): array
    {
        $response = $auth->getJson('/api/v1/review-availability?channel='.$channel)->assertOk();
        foreach (($response->json('data.days') ?? []) as $day) {
            foreach (($day['slots'] ?? []) as $slot) {
                if (($slot['available'] ?? false) && ($slot['remaining'] ?? 0) > 0) {
                    return $slot;
                }
            }
        }
        $this->fail('No contract-review slot is available. Run migrations/seeds or configure a future review schedule window for database workflow tests.');
    }

    private function createPendingAttachment(int $ownerUserId, string $fileName, string $mime = 'application/pdf'): int
    {
        return (int) DB::table('document_attachments')->insertGetId([
            'attachable_type' => 'pending',
            'attachable_id' => 0,
            'owner_user_id' => $ownerUserId,
            'file_path' => '/tmp/zdraft-tests/private/'.$fileName,
            'file_name' => $fileName,
            'original_file_name' => $fileName,
            'file_type' => $mime,
            'file_size_bytes' => 128,
            'visibility' => 'private',
            'created_at' => now(),
        ]);
    }

    private function setSetting(string $key, mixed $value): void
    {
        DB::statement(
            'INSERT INTO platform_settings(setting_key,setting_value_json,is_secret) VALUES (?,?::jsonb,FALSE) ON CONFLICT (setting_key) DO UPDATE SET setting_value_json=EXCLUDED.setting_value_json,updated_at=CURRENT_TIMESTAMP',
            [$key, json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)],
        );
    }

    private function loginSuperAdmin(): array
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

        return ['auth' => $auth, 'id' => (int) $admin->id];
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
