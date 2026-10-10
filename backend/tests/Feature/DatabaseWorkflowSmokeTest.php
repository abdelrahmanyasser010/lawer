<?php
namespace Tests\Feature;

use App\Services\SavedPartyService;
use App\Services\SelfServiceLawyerReviewService;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
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
            'requestPurpose' => 'review',
            'contractTypeText' => 'عقد إيجار',
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

    public function test_review_and_consultation_share_service_and_expose_first_class_fields(): void
    {
        $this->setSetting('services.contract_review.fee_egp', 450);
        $this->setSetting('services.contract_review.deposit_egp', 150);
        $client = $this->registerAndVerifyClient();
        $profile = $client->getJson('/api/v1/users/profile')->assertOk()->json('data');
        $clientId = (int) $profile['id'];

        $reviewAttachment = $this->createPendingAttachment($clientId, 'review-purpose-source.pdf');
        $reviewSlot = $this->firstAvailableSlot($client, 'whatsapp');
        $review = $client->postJson('/api/v1/service-requests', [
            'requestType' => 'contract_review',
            'requestPurpose' => 'review',
            'contractTypeText' => 'عقد إيجار محل تجاري',
            'title' => 'مراجعة عقد — إيجار محل تجاري',
            'communicationChannel' => 'whatsapp',
            'availabilitySlotKey' => $reviewSlot['slotKey'],
            'attachmentIds' => [$reviewAttachment],
        ])->assertCreated()
            ->assertJsonPath('data.requestPurpose', 'review')
            ->assertJsonPath('data.contractTypeText', 'عقد إيجار محل تجاري')
            ->assertJsonPath('data.paymentAmountEgp', 150)
            ->assertJsonPath('data.totalPriceEgp', 450)
            ->assertJsonPath('data.nextCustomerAction.type', 'pay');
        $reviewId = (int) $review->json('data.id');

        $consultationAttachment = $this->createPendingAttachment($clientId, 'consultation-purpose-source.pdf');
        $consultationSlot = $this->firstAvailableSlot($client, 'zoom');
        $client->postJson('/api/v1/service-requests', [
            'requestType' => 'contract_review',
            'requestPurpose' => 'consultation',
            'contractTypeText' => 'عقد شراكة',
            'title' => 'استشارة بخصوص عقد — شراكة',
            'description' => 'قصير',
            'communicationChannel' => 'zoom',
            'availabilitySlotKey' => $consultationSlot['slotKey'],
            'attachmentIds' => [$consultationAttachment],
        ])->assertStatus(422)
            ->assertJsonPath('code', 'CONSULTATION_QUESTION_REQUIRED');

        $consultation = $client->postJson('/api/v1/service-requests', [
            'requestType' => 'contract_review',
            'requestPurpose' => 'consultation',
            'contractTypeText' => 'عقد شراكة',
            'title' => 'استشارة بخصوص عقد — شراكة',
            'description' => 'أحتاج توضيح مسؤوليتي عن بند الخروج من الشراكة.',
            'communicationChannel' => 'zoom',
            'availabilitySlotKey' => $consultationSlot['slotKey'],
            'attachmentIds' => [$consultationAttachment],
        ])->assertCreated()
            ->assertJsonPath('data.requestPurpose', 'consultation')
            ->assertJsonPath('data.contractTypeText', 'عقد شراكة')
            ->assertJsonPath('data.paymentAmountEgp', 150)
            ->assertJsonPath('data.totalPriceEgp', 450);
        $consultationId = (int) $consultation->json('data.id');

        $client->getJson('/api/v1/service-requests/my')->assertOk()
            ->assertJsonFragment(['requestPurpose' => 'review', 'contractTypeText' => 'عقد إيجار محل تجاري'])
            ->assertJsonFragment(['requestPurpose' => 'consultation', 'contractTypeText' => 'عقد شراكة']);
        $client->getJson('/api/v1/service-requests/'.$consultationId)->assertOk()
            ->assertJsonPath('data.requestPurpose', 'consultation')
            ->assertJsonPath('data.contractTypeText', 'عقد شراكة')
            ->assertJsonPath('data.customerFacingStatus', 'مطلوب سداد الدفعة الأولى');

        $stored = DB::table('service_requests')->whereIn('id', [$reviewId, $consultationId])->orderBy('id')->get();
        $this->assertCount(2, $stored);
        $this->assertSame(['contract_review'], $stored->pluck('request_type')->unique()->values()->all());
        $this->assertSame(['review','consultation'], $stored->pluck('request_purpose')->values()->all());

        $admin = $this->loginSuperAdmin();
        $admin['auth']->getJson('/api/v1/admin/service-requests?type=contract_review')->assertOk()
            ->assertJsonFragment(['requestPurpose' => 'consultation', 'contractTypeText' => 'عقد شراكة']);
        $admin['auth']->getJson('/api/v1/dashboard/work-queue?serviceType=contract_review')->assertOk()
            ->assertJsonFragment(['requestPurpose' => 'review', 'contractTypeText' => 'عقد إيجار محل تجاري']);
    }

    public function test_review_and_consultation_required_fields_are_enforced(): void
    {
        $this->setSetting('services.contract_review.fee_egp', 300);
        $this->setSetting('services.contract_review.deposit_egp', 100);
        $client = $this->registerAndVerifyClient();
        $profile = $client->getJson('/api/v1/users/profile')->assertOk()->json('data');
        $attachmentId = $this->createPendingAttachment((int) $profile['id'], 'required-review-source.pdf');
        $slot = $this->firstAvailableSlot($client, 'whatsapp');
        $base = [
            'requestType' => 'contract_review',
            'requestPurpose' => 'review',
            'contractTypeText' => 'عقد بيع',
            'title' => 'مراجعة عقد بيع',
            'communicationChannel' => 'whatsapp',
            'availabilitySlotKey' => $slot['slotKey'],
            'attachmentIds' => [$attachmentId],
        ];

        $withoutPurpose = $base;
        unset($withoutPurpose['requestPurpose']);
        $client->postJson('/api/v1/service-requests', $withoutPurpose)->assertStatus(422)
            ->assertJsonPath('code', 'REQUEST_PURPOSE_REQUIRED');

        $withoutContractType = $base;
        unset($withoutContractType['contractTypeText']);
        $client->postJson('/api/v1/service-requests', $withoutContractType)->assertStatus(422)
            ->assertJsonPath('code', 'CONTRACT_TYPE_TEXT_REQUIRED');

        $withoutAttachment = $base;
        $withoutAttachment['attachmentIds'] = [];
        $client->postJson('/api/v1/service-requests', $withoutAttachment)->assertStatus(422)
            ->assertJsonPath('code', 'CONTRACT_REVIEW_DOCUMENT_REQUIRED');
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
            'requestPurpose' => 'review',
            'contractTypeText' => 'عقد إيجار',
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
                'requestPurpose' => 'review',
                'contractTypeText' => 'عقد إيجار',
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
            'requestPurpose' => 'review',
            'contractTypeText' => 'عقد إيجار',
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
            ->assertJsonFragment(['serialNumber' => $serial, 'status' => 'pending_verification'])
            ->assertJsonPath('data.0.source', 'legacy_receipt')
            ->assertJsonPath('data.0.refundedAmountEgp', 0);
        $auth->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('data.items.0.payload', fn ($value) => is_array($value));
    }

    public function test_kashier_checkout_and_webhook_settle_service_request(): void
    {
        $this->setSetting('services.contract_review.fee_egp', 300);
        $this->setSetting('services.contract_review.deposit_egp', 100);
        config([
            'zdraft.payment_gateway.provider' => 'kashier',
            'zdraft.payment_gateway.currency' => 'EGP',
            'zdraft.payment_gateway.return_url' => 'http://localhost:3000/payments/return',
            'zdraft.payment_gateway.webhook_url' => 'http://localhost:8000/api/v1/payments/webhooks/{provider}',
            'zdraft.payment_gateway.kashier.base_url' => 'https://test-api.kashier.io',
            'zdraft.payment_gateway.kashier.secret_key' => 'sk_test',
            'zdraft.payment_gateway.kashier.payment_api_key' => 'pay_key_test',
            'zdraft.payment_gateway.kashier.merchant_id' => 'MID-TEST',
            'zdraft.payment_gateway.kashier.allowed_methods' => 'card,wallet',
        ]);
        Http::fake([
            'test-api.kashier.io/v3/payment/sessions' => Http::response([
                'id' => 'KS-SESSION-1',
                'checkoutUrl' => 'https://checkout.kashier.test/session-1',
            ], 200),
        ]);

        $client = $this->registerAndVerifyClient();
        $profile = $client->getJson('/api/v1/users/profile')->assertOk()->json('data');
        $clientId = (int) $profile['id'];
        $slot = $this->firstAvailableSlot($client, 'whatsapp');
        $attachment = $this->createPendingAttachment($clientId, 'gateway-review-source.pdf');
        $requestId = (int) $client->postJson('/api/v1/service-requests', [
            'requestType' => 'contract_review',
            'requestPurpose' => 'review',
            'contractTypeText' => 'عقد إيجار',
            'title' => 'مراجعة عقد عبر كاشير',
            'description' => 'اختبار دفع إلكتروني لعربون مراجعة عقد.',
            'communicationChannel' => 'whatsapp',
            'availabilitySlotKey' => $slot['slotKey'],
            'attachmentIds' => [$attachment],
        ])->assertCreated()->json('data.id');

        $checkout = $client->postJson('/api/v1/payments/checkout', [
            'serviceRequestId' => $requestId,
            'provider' => 'kashier',
        ])->assertCreated()
            ->assertJsonPath('data.provider', 'kashier')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.amountEgp', 100)
            ->assertJsonPath('data.checkoutUrl', 'https://checkout.kashier.test/session-1');
        $attemptReference = (string) $checkout->json('data.attemptReference');
        $this->assertNotEmpty($attemptReference);
        Http::assertSent(fn ($request) =>
            $request->url() === 'https://test-api.kashier.io/v3/payment/sessions'
            && $request->hasHeader('Authorization', 'sk_test')
            && $request->hasHeader('api-key', 'pay_key_test')
            && $request['order'] === $attemptReference
            && $request['amount'] === '100.00'
            && $request['serverWebhook'] === 'http://localhost:8000/api/v1/payments/webhooks/kashier'
        );

        $data = [
            'amount' => '100.00',
            'currency' => 'EGP',
            'kashierOrderId' => 'KASHIER-ORDER-1',
            'merchantOrderId' => $attemptReference,
            'method' => 'card',
            'orderReference' => $attemptReference,
            'status' => 'SUCCESS',
            'transactionId' => 'TX-KASHIER-1',
            'transactionResponseCode' => '00',
        ];
        $data['signatureKeys'] = array_keys($data);
        sort($data['signatureKeys'], SORT_STRING);
        $signaturePayload = implode('&', array_map(
            fn (string $key) => $key.'='.rawurlencode((string) $data[$key]),
            $data['signatureKeys'],
        ));
        $signature = hash_hmac('sha256', $signaturePayload, 'pay_key_test');

        $mismatchData = $data;
        $mismatchData['amount'] = '101.00';
        $mismatchData['signatureKeys'] = array_keys(array_diff_key($mismatchData, ['signatureKeys' => true]));
        sort($mismatchData['signatureKeys'], SORT_STRING);
        $mismatchSignature = hash_hmac('sha256', implode('&', array_map(
            fn (string $key) => $key.'='.rawurlencode((string) $mismatchData[$key]),
            $mismatchData['signatureKeys'],
        )), 'pay_key_test');
        $this->withHeader('x-kashier-signature', $mismatchSignature)
            ->postJson('/api/v1/payments/webhooks/kashier', ['event' => 'payment.success', 'data' => $mismatchData])
            ->assertStatus(409)
            ->assertJsonPath('code', 'PAYMENT_WEBHOOK_AMOUNT_MISMATCH');
        $this->assertSame(0, DB::table('payments')->where('service_request_id', $requestId)->count());

        $this->withHeader('x-kashier-signature', $signature)
            ->postJson('/api/v1/payments/webhooks/kashier', ['event' => 'payment.success', 'data' => $data])
            ->assertOk()
            ->assertJsonPath('data.status', 'paid');

        $client->getJson('/api/v1/service-requests/'.$requestId)
            ->assertOk()
            ->assertJsonPath('data.status', 'new')
            ->assertJsonPath('data.bookingStatus', 'confirmed')
            ->assertJsonPath('data.approvedPaidEgp', 100)
            ->assertJsonPath('data.paymentStage', 'working');
        $payment = DB::table('payments')->where('service_request_id', $requestId)->first();
        $this->assertSame('gateway', $payment->source);
        $this->assertSame('kashier', $payment->provider);
        $this->assertSame('approved', $payment->status);
        $this->assertSame('TX-KASHIER-1', $payment->provider_reference);
    }

    public function test_paymob_checkout_uses_authoritative_backend_price(): void
    {
        $this->setSetting('services.contract_review.fee_egp', 450);
        $this->setSetting('services.contract_review.deposit_egp', 150);
        config([
            'zdraft.payment_gateway.provider' => 'paymob',
            'zdraft.payment_gateway.currency' => 'EGP',
            'zdraft.payment_gateway.return_url' => 'http://localhost:3000/payments/return',
            'zdraft.payment_gateway.webhook_url' => 'http://localhost:8000/api/v1/payments/webhooks/{provider}',
            'zdraft.payment_gateway.paymob.base_url' => 'https://accept.paymob.com',
            'zdraft.payment_gateway.paymob.secret_key' => 'paymob_secret_test',
            'zdraft.payment_gateway.paymob.public_key' => 'paymob_public_test',
            'zdraft.payment_gateway.paymob.hmac_secret' => 'paymob_hmac_test',
            'zdraft.payment_gateway.paymob.integration_ids' => [123456],
        ]);
        Http::fake([
            'accept.paymob.com/v1/intention/' => Http::response([
                'id' => 'INTENTION-1',
                'client_secret' => 'client_secret_test',
                'intention_order_id' => 'PM-ORDER-1',
            ], 200),
        ]);

        $client = $this->registerAndVerifyClient();
        $profile = $client->getJson('/api/v1/users/profile')->assertOk()->json('data');
        $slot = $this->firstAvailableSlot($client, 'zoom');
        $attachment = $this->createPendingAttachment((int) $profile['id'], 'paymob-review-source.pdf');
        $requestId = (int) $client->postJson('/api/v1/service-requests', [
            'requestType' => 'contract_review',
            'requestPurpose' => 'consultation',
            'contractTypeText' => 'عقد شراكة',
            'title' => 'استشارة عبر Paymob',
            'description' => 'أحتاج مراجعة بند الإدارة والخروج من الشركة.',
            'communicationChannel' => 'zoom',
            'availabilitySlotKey' => $slot['slotKey'],
            'attachmentIds' => [$attachment],
        ])->assertCreated()->json('data.id');

        $checkout = $client->postJson('/api/v1/payments/checkout', [
            'serviceRequestId' => $requestId,
            'provider' => 'paymob',
            'amountEgp' => 999999,
        ])->assertCreated()
            ->assertJsonPath('data.provider', 'paymob')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.amountEgp', 150);
        $this->assertStringContainsString('/unifiedcheckout/', (string) $checkout->json('data.checkoutUrl'));
        $this->assertStringContainsString('publicKey=paymob_public_test', (string) $checkout->json('data.checkoutUrl'));
        $this->assertStringContainsString('clientSecret=client_secret_test', (string) $checkout->json('data.checkoutUrl'));

        $attemptReference = (string) $checkout->json('data.attemptReference');
        Http::assertSent(fn ($request) =>
            $request->url() === 'https://accept.paymob.com/v1/intention/'
            && $request->hasHeader('Authorization', 'Token paymob_secret_test')
            && $request['amount'] === 15000
            && $request['special_reference'] === $attemptReference
            && $request['notification_url'] === 'http://localhost:8000/api/v1/payments/webhooks/paymob'
        );
    }

    public function test_contract_checkout_persists_lawyer_review_add_on_and_keeps_internal_work_item_off_customer_lists(): void
    {
        config([
            'zdraft.payment_gateway.provider' => 'kashier',
            'zdraft.payment_gateway.currency' => 'EGP',
            'zdraft.payment_gateway.webhook_url' => 'http://localhost:8000/api/v1/payments/webhooks/{provider}',
            'zdraft.payment_gateway.kashier.base_url' => 'https://test-api.kashier.io',
            'zdraft.payment_gateway.kashier.secret_key' => 'sk_test',
            'zdraft.payment_gateway.kashier.payment_api_key' => 'pay_key_test',
            'zdraft.payment_gateway.kashier.merchant_id' => 'MID-TEST',
            'zdraft.payment_gateway.kashier.allowed_methods' => 'card,wallet',
        ]);
        Http::fake([
            'test-api.kashier.io/v3/payment/sessions' => Http::sequence()
                ->push([
                    'id' => 'KS-CONTRACT-SESSION-1',
                    'checkoutUrl' => 'https://checkout.kashier.test/contract-session-1',
                ], 200)
                ->push([
                    'id' => 'KS-CONTRACT-SESSION-2',
                    'checkoutUrl' => 'https://checkout.kashier.test/contract-session-2',
                ], 200)
                ->push([
                    'id' => 'KS-CONTRACT-SESSION-3',
                    'checkoutUrl' => 'https://checkout.kashier.test/contract-session-3',
                ], 200),
        ]);

        $this->setSetting('services.self_service_lawyer_review.enabled', true);
        $client = $this->registerAndVerifyClient();
        $catalog = $client->getJson('/api/v1/catalog')->assertOk()->json('data.templates');
        $template = collect($catalog)->first(fn ($item) => ($item['selfServiceEnabled'] ?? false) && !empty($item['variants']));
        $this->assertNotNull($template);
        $variant = collect($template['variants'])->first(fn ($item) => ($item['selfServiceEnabled'] ?? false));
        $this->assertNotNull($variant);
        $slug = (string) $template['slug'];
        $variantKey = (string) $variant['key'];
        $this->setSetting("pricing.contracts.self_service.{$slug}.{$variantKey}", 125);
        $this->setSetting("pricing.contracts.lawyer_review_add_on.{$slug}.{$variantKey}", 75);

        $draft = $client->postJson('/api/v1/contracts/draft', [
            'templateSlug' => $slug,
            'variantKey' => $variantKey,
            'fieldValues' => [],
            'attachmentRefs' => [],
        ])->assertCreated();
        $contractId = (int) $draft->json('data.id');
        DB::table('contracts')->where('id', $contractId)->update(['status' => 'pending_payment']);

        $withReview = $client->postJson('/api/v1/payments/checkout', [
            'contractId' => $contractId,
            'provider' => 'kashier',
            'purpose' => 'self_service_with_lawyer_review',
            'amountEgp' => 999999,
            'metadata' => [
                'lawyerReviewEnabled' => true,
                'lawyerReviewNote' => 'راجع بند التزامات الطرف الثاني قبل الإصدار.',
            ],
        ])->assertCreated()
            ->assertJsonPath('data.amountEgp', 200)
            ->assertJsonPath('data.paymentAttemptId', fn ($value) => is_int($value))
            ->assertJsonPath('data.redirectRequired', true)
            ->assertJsonPath('data.checkoutUrl', 'https://checkout.kashier.test/contract-session-1');
        $attemptId = (int) $withReview->json('data.paymentAttemptId');
        $this->assertSame(75.0, (float) DB::table('contracts')->where('id', $contractId)->value('lawyer_review_add_on_price_egp'));
        $this->assertTrue((bool) DB::table('contracts')->where('id', $contractId)->value('lawyer_review_add_on_selected'));

        $client->getJson('/api/v1/payments/attempts/'.$attemptId)
            ->assertOk()
            ->assertJsonPath('data.paymentAttemptId', $attemptId)
            ->assertJsonPath('data.redirectRequired', true)
            ->assertJsonPath('data.amountEgp', 200);
        $sameAttempt = $client->postJson('/api/v1/payments/checkout', [
            'contractId' => $contractId,
            'provider' => 'kashier',
            'purpose' => 'self_service_with_lawyer_review',
            'metadata' => ['lawyerReviewEnabled' => true],
        ])->assertCreated();
        $this->assertSame($attemptId, (int) $sameAttempt->json('data.paymentAttemptId'));

        $withoutReview = $client->postJson('/api/v1/payments/checkout', [
            'contractId' => $contractId,
            'provider' => 'kashier',
            'purpose' => 'self_service',
            'metadata' => ['lawyerReviewEnabled' => false],
        ])->assertCreated()
            ->assertJsonPath('data.amountEgp', 125);
        $withoutReviewAttemptId = (int) $withoutReview->json('data.paymentAttemptId');
        $this->assertNotSame($attemptId, $withoutReviewAttemptId);
        $this->assertSame('cancelled', DB::table('payment_attempts')->where('id', $attemptId)->value('status'));
        $this->assertFalse((bool) DB::table('contracts')->where('id', $contractId)->value('lawyer_review_add_on_selected'));

        $finalReviewAttempt = $client->postJson('/api/v1/payments/checkout', [
            'contractId' => $contractId,
            'provider' => 'kashier',
            'purpose' => 'self_service_with_lawyer_review',
            'metadata' => ['lawyerReviewEnabled' => true],
        ])->assertCreated()
            ->assertJsonPath('data.amountEgp', 200)
            ->assertJsonPath('data.checkoutUrl', 'https://checkout.kashier.test/contract-session-3');
        $finalAttemptId = (int) $finalReviewAttempt->json('data.paymentAttemptId');
        $this->assertSame($attemptId, $finalAttemptId);
        $this->assertSame('cancelled', DB::table('payment_attempts')->where('id', $withoutReviewAttemptId)->value('status'));
        $attemptReference = (string) $finalReviewAttempt->json('data.attemptReference');

        $data = [
            'amount' => '200.00',
            'currency' => 'EGP',
            'kashierOrderId' => 'KASHIER-CONTRACT-ORDER',
            'merchantId' => 'MID-TEST',
            'merchantOrderId' => $attemptReference,
            'method' => 'card',
            'orderReference' => $attemptReference,
            'status' => 'SUCCESS',
            'transactionId' => 'TX-KASHIER-CONTRACT-1',
            'transactionResponseCode' => '00',
        ];
        $data['signatureKeys'] = array_keys($data);
        sort($data['signatureKeys'], SORT_STRING);
        $signature = hash_hmac('sha256', implode('&', array_map(
            fn (string $key) => $key.'='.rawurlencode((string) $data[$key]),
            $data['signatureKeys'],
        )), 'pay_key_test');

        $this->withHeader('x-kashier-signature', $signature)
            ->postJson('/api/v1/payments/webhooks/kashier', ['event' => 'payment.success', 'data' => $data])
            ->assertOk()
            ->assertJsonPath('data.status', 'paid');
        $this->withHeader('x-kashier-signature', $signature)
            ->postJson('/api/v1/payments/webhooks/kashier', ['event' => 'payment.success', 'data' => $data])
            ->assertOk()
            ->assertJsonPath('data.status', 'paid');

        $reviewRequests = DB::table('service_requests')->where('linked_contract_id', $contractId)->where('request_type', 'self_service_lawyer_review')->get();
        $this->assertCount(1, $reviewRequests);
        $this->assertSame(1, DB::table('payments')->where('contract_id', $contractId)->where('source', 'gateway')->count());
        $client->getJson('/api/v1/service-requests/my')->assertOk()
            ->assertJsonMissing(['requestType' => 'self_service_lawyer_review']);
        $client->getJson('/api/v1/customer/dashboard')->assertOk()
            ->assertJsonMissing(['requestType' => 'self_service_lawyer_review']);
        $client->getJson('/api/v1/service-requests/'.(int) $reviewRequests[0]->id)
            ->assertNotFound()
            ->assertJsonPath('code', 'INTERNAL_SERVICE_REQUEST');
        $client->getJson('/api/v1/contracts/'.$contractId)->assertOk()
            ->assertJsonPath('data.lawyer_review_add_on.enabled', true)
            ->assertJsonPath('data.lawyer_review_add_on.status', 'pending_assignment');
        $otherClient = $this->registerAndVerifyClient();
        $otherClient->getJson('/api/v1/payments/attempts/'.$attemptId)->assertNotFound();
        $admin = $this->loginSuperAdmin();
        $admin['auth']->getJson('/api/v1/dashboard/work-queue?serviceType=self_service_lawyer_review')->assertOk()
            ->assertJsonFragment(['requestType' => 'self_service_lawyer_review']);
    }

    public function test_contract_review_client_admin_payment_lifecycle(): void
    {
        $this->setSetting('services.contract_review.fee_egp', 500);
        $this->setSetting('services.contract_review.deposit_egp', 200);

        $client = $this->registerAndVerifyClient();
        $clientProfile = $client->getJson('/api/v1/users/profile')->assertOk()->json('data');
        $clientId = (int) $clientProfile['id'];
        $clientEmail = (string) $clientProfile['email'];

        $sourceContractAttachment = $this->createPendingAttachment($clientId, 'contract-to-review.pdf');
        $slot = $this->firstAvailableSlot($client, 'whatsapp');
        $created = $client->postJson('/api/v1/service-requests', [
            'requestType' => 'contract_review',
            'requestPurpose' => 'review',
            'contractTypeText' => 'عقد تجاري',
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

        $admin = $this->loginSuperAdmin();
        $adminAuth = $admin['auth'];
        $adminId = (int) $admin['id'];
        $adminAuth->postJson('/api/v1/admin/payments/'.$depositPaymentId.'/approve', [
            'notes' => 'تم اعتماد عربون المراجعة',
        ])->assertOk()->assertJsonPath('data.status', 'approved');

        $client = $this->loginClient($clientEmail);
        $client->getJson('/api/v1/service-requests/'.$requestId)
            ->assertOk()
            ->assertJsonPath('data.requestType', 'contract_review')
            ->assertJsonPath('data.status', 'new')
            ->assertJsonPath('data.bookingStatus', 'confirmed')
            ->assertJsonPath('data.approvedPaidEgp', 200)
            ->assertJsonPath('data.outstandingEgp', 300)
            ->assertJsonPath('data.paymentStage', 'working');
        $client->getJson('/api/v1/payments/my')
            ->assertOk()
            ->assertJsonFragment(['id' => $depositPaymentId, 'status' => 'paid'])
            ->assertJsonMissingPath('data.0.clientEmail');

        $adminAuth = $this->loginSuperAdmin()['auth'];
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
        $adminAuth->getJson('/api/v1/dashboard/work-queue?queue=awaiting_payment')->assertOk()
            ->assertJsonFragment(['serialNumber' => $created->json('data.serialNumber')]);
        $adminAuth->getJson('/api/v1/dashboard/work-queue?queue=ready_delivery')->assertOk()
            ->assertJsonMissing(['serialNumber' => $created->json('data.serialNumber')]);

        $client = $this->loginClient($clientEmail);
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

        $adminAuth = $this->loginSuperAdmin()['auth'];
        $adminAuth->postJson('/api/v1/admin/payments/'.$balancePaymentId.'/approve', [
            'notes' => 'تم اعتماد المبلغ المتبقي',
        ])->assertOk()->assertJsonPath('data.status', 'approved');

        $client = $this->loginClient($clientEmail);
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

        $adminAuth = $this->loginSuperAdmin()['auth'];
        $adminAuth->postJson('/api/v1/admin/service-requests/'.$requestId.'/status', [
            'status' => 'new',
        ])->assertStatus(409)
            ->assertJsonPath('code', 'INVALID_SERVICE_REQUEST_STATUS_TRANSITION');
    }

    public function test_review_result_can_be_text_only_or_file_only_and_exposes_file_id_alias(): void
    {
        $client=$this->registerAndVerifyClient();$clientProfile=$client->getJson('/api/v1/users/profile')->assertOk()->json('data');$clientId=(int)$clientProfile['id'];
        $requestId=(int)DB::table('service_requests')->insertGetId([
            'serial_number'=>'REV-TEST-'.bin2hex(random_bytes(4)),
            'request_type'=>'contract_review',
            'request_purpose'=>'consultation',
            'source_channel'=>'customer',
            'client_user_id'=>$clientId,
            'title'=>'استشارة ومراجعة نصية',
            'status'=>'in_progress',
            'metadata_json'=>json_encode(['description'=>'سؤال قانوني مختصر','serviceTotalPriceEgp'=>0,'expectedPaymentEgp'=>0,'paymentStage'=>'paid'],JSON_UNESCAPED_UNICODE),
            'created_at'=>now(),
            'updated_at'=>now(),
        ]);
        $admin=$this->loginSuperAdmin();$adminAuth=$admin['auth'];$adminId=(int)$admin['id'];
        $adminAuth->postJson("/api/v1/admin/service-requests/{$requestId}/deliverables",[
            'type'=>'review_report',
            'title'=>'نتيجة نصية',
            'notes'=>'الرأي القانوني المختصر داخل النص فقط.',
            'isFinal'=>true,
        ])->assertCreated()->assertJsonPath('data.status','client_review');
        $client=$this->loginClient((string)$clientProfile['email']);
        $client->getJson("/api/v1/service-requests/{$requestId}")->assertOk()
            ->assertJsonPath('data.result.text','الرأي القانوني المختصر داخل النص فقط.')
            ->assertJsonPath('data.result.file',null);

        $fileId=$this->createPendingAttachment($adminId,'consultation-result.pdf');
        $adminAuth=$this->loginSuperAdmin()['auth'];
        $adminAuth->postJson("/api/v1/admin/service-requests/{$requestId}/deliverables",[
            'attachmentId'=>$fileId,
            'type'=>'review_report',
            'title'=>'نتيجة ملف فقط',
            'isFinal'=>true,
        ])->assertCreated()->assertJsonPath('data.status','client_review');
        $client=$this->loginClient((string)$clientProfile['email']);
        $client->getJson("/api/v1/service-requests/{$requestId}")->assertOk()
            ->assertJsonPath('data.result.text',null)
            ->assertJsonPath('data.result.file.id',$fileId)
            ->assertJsonPath('data.result.file.attachmentId',$fileId);
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
            'requestPurpose' => 'review',
            'contractTypeText' => 'عقد إيجار',
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
        $slot = $this->firstAvailableSlot($client, 'whatsapp');
        $sourceAttachment = $this->createPendingAttachment($clientId, 'cancelled-request-source.pdf');

        $created = $client->postJson('/api/v1/service-requests', [
            'requestType' => 'contract_review',
            'requestPurpose' => 'review',
            'contractTypeText' => 'عقد إيجار',
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

        $adminAuth = $this->loginSuperAdmin()['auth'];
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

    public function test_assignable_lawyers_endpoint_reuses_staff_roles_when_assignment_enabled(): void
    {
        $admin = $this->loginSuperAdmin();
        $auth = $admin['auth'];

        $auth->getJson('/api/v1/admin/team/assignable-lawyers')
            ->assertNotFound()
            ->assertJsonPath('code', 'FEATURE_DISABLED');

        $roleId = DB::table('roles')->where('role_key', 'lawyer')->value('id');
        $this->assertNotNull($roleId);
        $email = 'lawyer+'.bin2hex(random_bytes(4)).'@example.test';
        $lawyerId = DB::table('users')->insertGetId([
            'public_id' => 'STF-'.strtoupper(substr(hash('sha256', $email), 0, 12)),
            'pubg_id' => 'LWY'.strtoupper(substr(hash('sha256', $email), 0, 7)),
            'name' => 'محامي تعيين اختبار',
            'email' => $email,
            'password_hash' => Hash::make('StrongLawyerPass123'),
            'account_type' => 'individual',
            'status' => 'active',
            'email_verified_at' => now(),
            'role' => 'lawyer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('staff_profiles')->insert([
            'user_id' => $lawyerId,
            'staff_status' => 'active',
            'job_title' => 'عقود تجارية',
            'password_change_required' => false,
            'activated_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('staff_role_assignments')->insert([
            'user_id' => $lawyerId,
            'role_id' => $roleId,
            'assigned_by' => $admin['id'],
            'assigned_at' => now(),
        ]);

        config(['zdraft.features.assignment' => true]);
        $auth->getJson('/api/v1/admin/team/assignable-lawyers')
            ->assertOk()
            ->assertJsonFragment(['id' => $lawyerId, 'displayName' => 'محامي تعيين اختبار', 'specialization' => 'عقود تجارية'])
            ->assertJsonPath('data.0.profileImage', null)
            ->assertJsonMissingPath('data.0.email');
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

    public function test_catalog_exposes_admin_controlled_channel_and_variant_metadata(): void
    {
        $template = DB::table('contract_templates')->where('slug', 'rental')->first();
        $this->assertNotNull($template);
        $version = DB::table('template_versions')->where('id', $template->current_published_version_id)->first();
        $this->assertNotNull($version);
        $definition = is_string($version->definition_json) ? json_decode($version->definition_json, true) : (array) $version->definition_json;
        $this->assertNotEmpty($definition['variants'][0]['key'] ?? null);
        $variantKey = (string) $definition['variants'][0]['key'];
        $definition['variants'][0]['selfServiceEnabled'] = true;
        $definition['variants'][0]['lawyerDraftingEnabled'] = true;
        $definition['variants'][0]['tags'] = ['إيجار', 'سكني'];
        $definition['variants'][0]['suitability'] = [
            'shortDescription' => 'مناسب لإيجار وحدة سكنية.',
            'suitableFor' => ['إيجار شقة'],
            'notSuitableFor' => ['الإيجار التجاري'],
        ];
        $definition['variants'][0]['lawyerDrafting'] = ['helpfulDocuments' => ['صورة بطاقة المالك']];
        DB::table('template_versions')->where('id', $version->id)->update(['definition_json' => json_encode($definition, JSON_UNESCAPED_UNICODE)]);
        DB::table('contract_templates')->where('id', $template->id)->update(['self_service_enabled' => true, 'lawyer_drafting_enabled' => true]);
        $this->setSetting('services.self_service_lawyer_review.enabled', true);
        $this->setSetting('services.self_service_lawyer_review.fee_egp', 325);

        $catalog = $this->getJson('/api/v1/catalog')->assertOk()->json('data');
        $rental = collect($catalog['templates'])->firstWhere('slug', 'rental');
        $this->assertNotNull($rental);
        $variant = collect($rental['variants'])->firstWhere('key', $variantKey);
        $this->assertNotNull($variant);
        $this->assertTrue($variant['selfServiceEnabled']);
        $this->assertTrue($variant['lawyerDraftingEnabled']);
        $this->assertSame(['إيجار', 'سكني'], $variant['tags']);
        $this->assertSame('مناسب لإيجار وحدة سكنية.', $variant['suitability']['shortDescription']);
        $this->assertSame(['صورة بطاقة المالك'], $variant['lawyerDrafting']['helpfulDocuments']);
        $this->assertTrue($variant['lawyerReviewAddOn']['enabled']);
        $this->assertSame(325.0, (float) $variant['lawyerReviewAddOn']['priceEgp']);

        $admin = $this->loginSuperAdmin();
        $admin['auth']->patchJson('/api/v1/admin/templates/'.$template->id, [
            'selfServiceEnabled' => false,
            'lawyerDraftingEnabled' => false,
        ])->assertOk()
            ->assertJsonPath('data.selfServiceEnabled', false)
            ->assertJsonPath('data.lawyerDraftingEnabled', false);
        $admin['auth']->getJson('/api/v1/admin/templates')->assertOk()
            ->assertJsonFragment(['slug' => 'rental', 'selfServiceEnabled' => false, 'lawyerDraftingEnabled' => false]);

        $catalog = $this->getJson('/api/v1/catalog')->assertOk()->json('data');
        $rental = collect($catalog['templates'])->firstWhere('slug', 'rental');
        $variant = collect($rental['variants'])->firstWhere('key', $variantKey);
        $this->assertFalse($variant['selfServiceEnabled']);
        $this->assertFalse($variant['lawyerDraftingEnabled']);
        $this->assertFalse($variant['lawyerReviewAddOn']['enabled']);
    }

    public function test_disabled_contract_channels_are_rejected_server_side_and_drafting_files_are_optional(): void
    {
        $template = DB::table('contract_templates')->where('slug', 'rental')->first();
        $version = DB::table('template_versions')->where('id', $template->current_published_version_id)->first();
        $definition = is_string($version->definition_json) ? json_decode($version->definition_json, true) : (array) $version->definition_json;
        $variantKey = (string) ($definition['variants'][0]['key'] ?? '');
        $this->assertNotSame('', $variantKey);
        $definition['variants'][0]['selfServiceEnabled'] = true;
        $definition['variants'][0]['lawyerDraftingEnabled'] = true;
        DB::table('template_versions')->where('id', $version->id)->update(['definition_json' => json_encode($definition, JSON_UNESCAPED_UNICODE)]);
        $this->setSetting('pricing.contracts.self_service.rental.'.$variantKey, 500);
        $this->setSetting('pricing.contracts.lawyer_assisted.rental.'.$variantKey, 1200);
        $this->setSetting('services.contract_drafting.deposit_egp', 300);
        DB::table('contract_templates')->where('id', $template->id)->update(['self_service_enabled' => false, 'lawyer_drafting_enabled' => true]);

        $auth = $this->registerAndVerifyClient();
        $auth->postJson('/api/v1/contracts/draft', [
            'templateSlug' => 'rental',
            'variantKey' => $variantKey,
            'fieldValues' => [],
            'attachmentRefs' => [],
        ])->assertStatus(409)->assertJsonPath('code', 'SELF_SERVICE_VARIANT_DISABLED');

        DB::table('contract_templates')->where('id', $template->id)->update(['self_service_enabled' => true, 'lawyer_drafting_enabled' => false]);
        $draftingPayload = [
            'requestType' => 'contract_drafting',
            'title' => 'صياغة عقد إيجار بواسطة محامٍ',
            'description' => 'أحتاج صياغة عقد إيجار للوحدة مع توضيح الالتزامات الخاصة.',
            'communicationChannel' => 'whatsapp',
            'templateSlug' => 'rental',
            'variantKey' => $variantKey,
            'attachmentIds' => [],
        ];
        $auth->postJson('/api/v1/service-requests', $draftingPayload)
            ->assertStatus(409)->assertJsonPath('code', 'LAWYER_DRAFTING_VARIANT_DISABLED');

        DB::table('contract_templates')->where('id', $template->id)->update(['lawyer_drafting_enabled' => true]);
        $auth->postJson('/api/v1/service-requests', $draftingPayload)
            ->assertCreated()
            ->assertJsonPath('data.status', 'awaiting_payment')
            ->assertJsonPath('data.selectedContractTypeName', (string) ($definition['variants'][0]['nameAr'] ?? $variantKey))
            ->assertJsonPath('data.paymentAmountEgp', 300)
            ->assertJsonPath('data.totalPriceEgp', 1200);
    }

    public function test_reusable_profile_and_saved_parties_are_owned_and_materialized_only_after_issue(): void
    {
        $auth = $this->registerAndVerifyClient();
        $profile = $auth->patchJson('/api/v1/users/profile', [
            'reusableData' => [
                'nationalId' => '29801011234567',
                'nationality' => 'مصري',
                'address' => 'القاهرة',
            ],
        ])->assertOk()
            ->assertJsonPath('data.reusableData.nationalId', '29801011234567')
            ->assertJsonPath('data.reusableData.address', 'القاهرة');
        $ownerId = (int) $profile->json('data.id');
        $ownerEmail = (string) $profile->json('data.email');
        $auth->patchJson('/api/v1/users/profile', ['reusableData' => ['unknownIdentityField' => 'x']])
            ->assertStatus(422)->assertJsonPath('code', 'PROFILE_REUSABLE_FIELDS_INVALID');

        $template = DB::table('contract_templates')->where('slug', 'rental')->first();
        DB::table('contract_templates')->where('id', $template->id)->update(['self_service_enabled' => true]);
        $version = DB::table('template_versions')->where('id', $template->current_published_version_id)->first();
        $definition = is_string($version->definition_json) ? json_decode($version->definition_json, true) : (array) $version->definition_json;
        $variant = $definition['variants'][0];
        $step = collect($variant['steps'] ?? [])->first(function (array $candidate): bool {
            return collect($candidate['fields'] ?? [])->contains(fn(array $field) => str_ends_with(strtolower((string) ($field['key'] ?? '')), '_name'));
        });
        $this->assertIsArray($step, 'The published rental schema must contain at least one party step with a name field.');
        $fields = [];
        foreach ($step['fields'] as $field) {
            $key = strtolower((string) ($field['key'] ?? ''));
            if (str_ends_with($key, '_company_name')) $fields[$field['key']] = 'شركة النور للاختبار';
            elseif (str_ends_with($key, '_name')) $fields[$field['key']] = 'طرف محفوظ للاختبار';
            elseif (str_ends_with($key, '_national_id')) $fields[$field['key']] = '29801011234567';
            elseif (str_ends_with($key, '_phone')) $fields[$field['key']] = '01011112222';
            elseif (str_ends_with($key, '_email')) $fields[$field['key']] = 'party@example.test';
            elseif (str_ends_with($key, '_address')) $fields[$field['key']] = 'مدينة نصر، القاهرة';
            elseif (str_ends_with($key, '_party_type')) $fields[$field['key']] = 'individual';
        }
        $this->setSetting('pricing.contracts.self_service.rental.'.$variant['key'], 500);
        $created = $auth->postJson('/api/v1/contracts/draft', [
            'templateSlug' => 'rental',
            'variantKey' => $variant['key'],
            'fieldValues' => $fields,
            'attachmentRefs' => [],
            'partyReusePreferences' => [$step['key'] => true],
        ])->assertCreated();
        $contractId = (int) $created->json('data.id');
        $auth->getJson('/api/v1/contracts/'.$contractId)->assertOk()
            ->assertJsonPath('data.partyReusePreferences.'.$step['key'], true);

        $materializer = app(SavedPartyService::class);
        $this->assertSame([], $materializer->finalizeForIssuedContract($contractId));
        $auth->getJson('/api/v1/saved-parties')->assertOk()->assertJsonCount(0, 'data');

        DB::table('contracts')->where('id', $contractId)->update(['status' => 'issued', 'issued_at' => now()]);
        $savedIds = $materializer->finalizeForIssuedContract($contractId);
        $this->assertCount(1, $savedIds);
        $savedId = $savedIds[0];
        $saved = $auth->getJson('/api/v1/saved-parties/'.$savedId)->assertOk()
            ->assertJsonPath('data.sourceContractId', $contractId)
            ->assertJsonPath('data.data.nationalId', '29801011234567');
        $originalSnapshot = DB::table('contracts')->where('id', $contractId)->value('field_values_json');

        $auth->patchJson('/api/v1/saved-parties/'.$savedId, [
            'displayName' => 'طرف محدث للعقود القادمة',
            'data' => array_merge($saved->json('data.data'), ['address' => 'الإسكندرية']),
        ])->assertOk()
            ->assertJsonPath('data.displayName', 'طرف محدث للعقود القادمة')
            ->assertJsonPath('data.data.address', 'الإسكندرية');
        $this->assertSame($originalSnapshot, DB::table('contracts')->where('id', $contractId)->value('field_values_json'));

        $otherAuth = $this->registerAndVerifyClient();
        $otherAuth->getJson('/api/v1/saved-parties/'.$savedId)->assertNotFound();
        $otherAuth->patchJson('/api/v1/saved-parties/'.$savedId, ['displayName' => 'محاولة غير مصرح بها'])->assertNotFound();
        $otherAuth->deleteJson('/api/v1/saved-parties/'.$savedId)->assertNotFound();
        $this->assertSame($ownerId, (int) DB::table('saved_parties')->where('id', $savedId)->value('owner_user_id'));

        $ownerAuth = $this->loginClient($ownerEmail);
        $ownerAuth->deleteJson('/api/v1/saved-parties/'.$savedId)->assertOk()->assertJsonPath('data.deleted', true);
        $this->assertSame($originalSnapshot, DB::table('contracts')->where('id', $contractId)->value('field_values_json'));
    }

    public function test_customer_dashboard_aggregates_explicit_required_actions(): void
    {
        $this->getJson('/api/v1/customer/dashboard')->assertUnauthorized();
        $template = DB::table('contract_templates')->where('slug', 'rental')->first();
        DB::table('contract_templates')->where('id', $template->id)->update(['self_service_enabled' => true]);
        $version = DB::table('template_versions')->where('id', $template->current_published_version_id)->first();
        $definition = is_string($version->definition_json) ? json_decode($version->definition_json, true) : (array) $version->definition_json;
        $variantKey = (string) $definition['variants'][0]['key'];
        $this->setSetting('pricing.contracts.self_service.rental.'.$variantKey, 500);
        $auth = $this->registerAndVerifyClient();
        $contract = $auth->postJson('/api/v1/contracts/draft', [
            'templateSlug' => 'rental',
            'variantKey' => $variantKey,
            'fieldValues' => [],
            'attachmentRefs' => [],
        ])->assertCreated();
        $contractId = (int) $contract->json('data.id');

        $dashboard = $auth->getJson('/api/v1/customer/dashboard')->assertOk()
            ->assertJsonPath('data.recentContracts.0.id', $contractId)
            ->assertJsonPath('data.recentContracts.0.customerFacingStatus', 'مسودة محفوظة — استكمل بيانات العقد')
            ->assertJsonPath('data.recentContracts.0.nextCustomerAction.type', 'continue_contract')
            ->assertJsonPath('data.requiredActions.0.sourceType', 'contract')
            ->assertJsonPath('data.requiredActions.0.sourceId', $contractId);
        $this->assertSame('/wizard/rental?contractId='.$contractId, $dashboard->json('data.requiredActions.0.action.actionUrl'));
    }

    public function test_legal_content_publishing_creates_immutable_versions(): void
    {
        $initial = $this->getJson('/api/v1/public/legal-content/terms_and_conditions')->assertOk();
        $initialVersion = (int) $initial->json('data.publishedVersion');
        $admin = $this->loginSuperAdmin();
        $body = 'شروط اختبار محدثة توضح نطاق الخدمة والسعر والالتزامات قبل إتمام أي عملية دفع.';
        $admin['auth']->putJson('/api/v1/admin/legal-content/terms_and_conditions', [
            'title' => 'الشروط والأحكام — اختبار',
            'body' => $body,
            'isPublished' => true,
        ])->assertOk()->assertJsonPath('data.publishedVersion', $initialVersion + 1);
        $this->getJson('/api/v1/public/legal-content/terms_and_conditions')->assertOk()
            ->assertJsonPath('data.body', $body)
            ->assertJsonPath('data.publishedVersion', $initialVersion + 1);

        $admin['auth']->putJson('/api/v1/admin/legal-content/terms_and_conditions', [
            'title' => 'الشروط والأحكام — اختبار',
            'body' => $body,
            'isPublished' => true,
        ])->assertOk()->assertJsonPath('data.publishedVersion', $initialVersion + 1);
        $this->assertSame(1, DB::table('legal_content_versions')->where('content_key', 'terms_and_conditions')->where('version_number', $initialVersion + 1)->count());

        $admin['auth']->putJson('/api/v1/admin/legal-content/terms_and_conditions', [
            'title' => 'الشروط والأحكام — اختبار',
            'body' => $body,
            'isPublished' => false,
        ])->assertOk()->assertJsonPath('data.isPublished', false);
        $this->getJson('/api/v1/public/legal-content/terms_and_conditions')->assertNotFound()
            ->assertJsonPath('code', 'LEGAL_CONTENT_NOT_PUBLISHED');
        $this->assertSame($body, DB::table('legal_content_versions')->where('content_key', 'terms_and_conditions')->where('version_number', $initialVersion + 1)->value('body'));
    }

    public function test_registration_and_checkout_acceptances_store_exact_legal_versions(): void
    {
        $auth = $this->registerAndVerifyClient();
        $profile = $auth->getJson('/api/v1/users/profile')->assertOk()->json('data');
        $userId = (int) $profile['id'];
        $registration = DB::table('legal_acceptances')->where('user_id', $userId)->where('context', 'registration')->get();
        $this->assertCount(2, $registration);
        $this->assertEqualsCanonicalizing(['terms_and_conditions','privacy_policy'], $registration->pluck('document_type')->all());

        $refund = $this->getJson('/api/v1/public/legal-content/refund_cancellation_policy')->assertOk()->json('data');
        $auth->postJson('/api/v1/legal-acceptances', [
            'documentType' => 'refund_cancellation_policy',
            'publishedVersion' => $refund['publishedVersion'],
            'context' => 'checkout',
        ])->assertOk()->assertJsonPath('data.accepted', true);
        $auth->postJson('/api/v1/legal-acceptances', [
            'documentType' => 'refund_cancellation_policy',
            'publishedVersion' => $refund['publishedVersion'],
            'context' => 'checkout',
        ])->assertOk();
        $this->assertSame(1, DB::table('legal_acceptances')->where('user_id', $userId)->where('document_type', 'refund_cancellation_policy')->where('context', 'checkout')->count());
        $admin=$this->loginSuperAdmin();
        $admin['auth']->putJson('/api/v1/admin/legal-content/refund_cancellation_policy', [
            'title' => 'سياسة الاسترداد — نسخة أحدث',
            'body' => 'نص سياسة الاسترداد المحدثة لاختبار رفض قبول نسخة قديمة بعد نشر نسخة أحدث.',
            'isPublished' => true,
        ])->assertOk()->assertJsonPath('data.publishedVersion', $refund['publishedVersion'] + 1);
        $auth=$this->loginClient((string)$profile['email']);
        $auth->postJson('/api/v1/legal-acceptances', [
            'documentType' => 'refund_cancellation_policy',
            'publishedVersion' => $refund['publishedVersion'],
            'context' => 'checkout',
        ])->assertStatus(409)->assertJsonPath('code', 'LEGAL_CONTENT_VERSION_OUTDATED');
        $currentRefund = $auth->getJson('/api/v1/public/legal-content/refund_cancellation_policy')->assertOk()->json('data');
        $auth->postJson('/api/v1/legal-acceptances', [
            'documentType' => 'refund_cancellation_policy',
            'publishedVersion' => $currentRefund['publishedVersion'],
            'context' => 'checkout',
        ])->assertOk()->assertJsonPath('data.accepted', true);
        $auth->postJson('/api/v1/legal-acceptances', [
            'documentType' => 'refund_cancellation_policy',
            'publishedVersion' => 999999,
            'context' => 'checkout',
        ])->assertStatus(422)->assertJsonPath('code', 'LEGAL_CONTENT_VERSION_NOT_FOUND');
    }

    public function test_self_service_lawyer_review_uses_variant_price_and_blocks_issuance_until_completed(): void
    {
        $auth=$this->registerAndVerifyClient();$userId=(int)$auth->getJson('/api/v1/users/profile')->assertOk()->json('data.id');
        $catalog=$auth->getJson('/api/v1/catalog')->assertOk()->json('data.templates');
        $template=collect($catalog)->first(fn($item)=>($item['selfServiceEnabled']??false)&&!empty($item['variants']));
        $this->assertNotNull($template);
        $variant=collect($template['variants'])->first(fn($item)=>($item['selfServiceEnabled']??false));
        $this->assertNotNull($variant);
        $slug=(string)$template['slug'];$variantKey=(string)$variant['key'];
        $this->setSetting('services.self_service_lawyer_review.enabled',true);
        $this->setSetting("pricing.contracts.self_service.{$slug}.{$variantKey}",125);
        $this->setSetting("pricing.contracts.lawyer_review_add_on.{$slug}.{$variantKey}",75);

        $auth->getJson('/api/v1/catalog')->assertOk()
            ->assertJsonFragment(['key'=>$variantKey,'selfServicePriceEgp'=>125.0,'lawyerReviewAddOn'=>['enabled'=>true,'priceEgp'=>75.0]]);
        $draft=$auth->postJson('/api/v1/contracts/draft',['templateSlug'=>$slug,'variantKey'=>$variantKey,'fieldValues'=>[],'attachmentRefs'=>[]])->assertCreated();
        $contractId=(int)$draft->json('data.id');
        $review=app(SelfServiceLawyerReviewService::class);
        $selection=$review->selectForCheckout($contractId,$userId,'راجع بيانات الطرف الثاني.');
        $this->assertSame(75.0,$selection['priceEgp']);
        DB::table('payments')->insert(['serial_number'=>'PAY-TEST-'.bin2hex(random_bytes(4)),'user_id'=>$userId,'contract_id'=>$contractId,'amount_egp'=>200,'payment_method'=>'gateway_test','status'=>'approved','source'=>'legacy_receipt','payment_stage'=>'full','created_at'=>now()]);
        $requestId=$review->activateAfterSettledPayment($contractId,$userId);
        $this->assertNotNull($requestId);

        $auth->getJson("/api/v1/contracts/{$contractId}")->assertOk()
            ->assertJsonPath('data.lawyer_review_add_on.enabled',true)
            ->assertJsonPath('data.lawyer_review_add_on.priceEgp',75)
            ->assertJsonPath('data.lawyer_review_add_on.status','pending_assignment')
            ->assertJsonPath('data.customerFacingStatus','العقد عند المحامي للمراجعة')
            ->assertJsonPath('data.lawyer_review_add_on.issuanceBlocked',true)
            ->assertJsonPath('data.permissions.canFinalize',false);
        $auth->getJson('/api/v1/contracts/my')->assertOk()
            ->assertJsonFragment(['id'=>$contractId,'customerFacingStatus'=>'العقد عند المحامي للمراجعة']);
        $auth->getJson('/api/v1/customer/dashboard')->assertOk()
            ->assertJsonFragment(['id'=>$contractId,'customerFacingStatus'=>'العقد عند المحامي للمراجعة']);
        $auth->postJson("/api/v1/contracts/{$contractId}/finalize",['confirmEarlyFinalization'=>true])
            ->assertStatus(409)->assertJsonPath('code','LAWYER_REVIEW_REQUIRED_BEFORE_ISSUANCE');

        $admin=$this->loginSuperAdmin();
        $admin['auth']->postJson("/api/v1/admin/service-requests/{$requestId}/status",['status'=>'in_progress','notes'=>'بدأت المراجعة'])->assertOk();
        $admin['auth']->postJson("/api/v1/admin/service-requests/{$requestId}/status",['status'=>'completed','notes'=>'اكتملت المراجعة'])->assertOk();
        $admin['auth']->getJson("/api/v1/contracts/{$contractId}")->assertOk()
            ->assertJsonPath('data.lawyer_review_add_on.status','completed')
            ->assertJsonPath('data.lawyer_review_add_on.issuanceBlocked',false);
        $review->assertIssuanceAllowed(DB::table('contracts')->where('id',$contractId)->first());
        $this->addToAssertionCount(1);
        $this->assertSame('completed',DB::table('contracts')->where('id',$contractId)->value('lawyer_review_add_on_status'));
        $this->assertSame('self_service_lawyer_review',DB::table('service_requests')->where('id',$requestId)->value('request_type'));
    }

    public function test_customer_can_cancel_only_unpaid_pre_execution_service_request(): void
    {
        $auth=$this->registerAndVerifyClient();$userId=(int)$auth->getJson('/api/v1/users/profile')->assertOk()->json('data.id');
        $requestId=(int)DB::table('service_requests')->insertGetId(['serial_number'=>'REQ-TEST-'.bin2hex(random_bytes(4)),'request_type'=>'contract_drafting','source_channel'=>'customer','client_user_id'=>$userId,'title'=>'طلب غير مدفوع','status'=>'awaiting_payment','metadata_json'=>json_encode(['expectedPaymentEgp'=>100,'serviceTotalPriceEgp'=>500,'paymentStage'=>'deposit']),'created_at'=>now(),'updated_at'=>now()]);
        $auth->postJson("/api/v1/service-requests/{$requestId}/cancel",['reason'=>'لن أكمل الطلب الآن'])->assertOk()->assertJsonPath('data.status','cancelled');

        $paidRequestId=(int)DB::table('service_requests')->insertGetId(['serial_number'=>'REQ-TEST-'.bin2hex(random_bytes(4)),'request_type'=>'contract_drafting','source_channel'=>'customer','client_user_id'=>$userId,'title'=>'طلب مدفوع','status'=>'new','metadata_json'=>json_encode(['expectedPaymentEgp'=>0,'serviceTotalPriceEgp'=>500,'paymentStage'=>'working']),'created_at'=>now(),'updated_at'=>now()]);
        DB::table('payments')->insert(['serial_number'=>'PAY-TEST-'.bin2hex(random_bytes(4)),'user_id'=>$userId,'service_request_id'=>$paidRequestId,'amount_egp'=>100,'payment_method'=>'gateway_test','status'=>'approved','source'=>'legacy_receipt','payment_stage'=>'initial','created_at'=>now()]);
        $auth->postJson("/api/v1/service-requests/{$paidRequestId}/cancel",['reason'=>'أريد الإلغاء'])->assertStatus(409)->assertJsonPath('code','PAID_REQUEST_REQUIRES_ADMIN_CANCELLATION');
    }

    public function test_admin_remaining_collection_requires_exact_balance_reason_and_cannot_repeat(): void
    {
        $auth=$this->registerAndVerifyClient();$userId=(int)$auth->getJson('/api/v1/users/profile')->assertOk()->json('data.id');
        $requestId=(int)DB::table('service_requests')->insertGetId(['serial_number'=>'REQ-TEST-'.bin2hex(random_bytes(4)),'request_type'=>'contract_drafting','source_channel'=>'customer','client_user_id'=>$userId,'title'=>'صياغة بعربون ومتَبقٍ','status'=>'awaiting_payment','metadata_json'=>json_encode(['expectedPaymentEgp'=>3000,'serviceTotalPriceEgp'=>5000,'serviceDepositEgp'=>2000,'serviceRemainingEgp'=>3000,'paymentStage'=>'balance']),'created_at'=>now(),'updated_at'=>now()]);
        DB::table('payments')->insert(['serial_number'=>'PAY-TEST-'.bin2hex(random_bytes(4)),'user_id'=>$userId,'service_request_id'=>$requestId,'amount_egp'=>2000,'payment_method'=>'gateway_test','status'=>'approved','source'=>'legacy_receipt','payment_stage'=>'initial','created_at'=>now()]);
        $admin=$this->loginSuperAdmin();
        $admin['auth']->postJson("/api/v1/admin/service-requests/{$requestId}/record-remaining-payment",['amountEgp'=>3000])->assertStatus(422);
        $admin['auth']->postJson("/api/v1/admin/service-requests/{$requestId}/record-remaining-payment",['amountEgp'=>2500,'reason'=>'تحصيل خارجي موثق'])->assertStatus(422)->assertJsonPath('code','PAYMENT_AMOUNT_MISMATCH');
        $admin['auth']->postJson("/api/v1/admin/service-requests/{$requestId}/record-remaining-payment",['amountEgp'=>3000,'reason'=>'تحصيل خارجي موثق','externalReference'=>'OFFLINE-TEST-1'])->assertCreated()
            ->assertJsonPath('data.status','paid')->assertJsonPath('data.paymentStage','balance');
        $this->assertSame('admin_manual_collection',DB::table('payments')->where('service_request_id',$requestId)->where('payment_stage','balance')->value('source'));
        $admin['auth']->postJson("/api/v1/admin/service-requests/{$requestId}/record-remaining-payment",['amountEgp'=>3000,'reason'=>'محاولة مكررة'])->assertStatus(409);
    }

    public function test_admin_paid_filter_and_refund_endpoint_is_explicitly_not_available_without_provider_support(): void
    {
        $auth=$this->registerAndVerifyClient();$userId=(int)$auth->getJson('/api/v1/users/profile')->assertOk()->json('data.id');
        $requestId=(int)DB::table('service_requests')->insertGetId(['serial_number'=>'REQ-TEST-'.bin2hex(random_bytes(4)),'request_type'=>'contract_drafting','source_channel'=>'customer','client_user_id'=>$userId,'title'=>'طلب مدفوع للاسترداد','status'=>'new','metadata_json'=>json_encode(['expectedPaymentEgp'=>0,'serviceTotalPriceEgp'=>250,'paymentStage'=>'working']),'created_at'=>now(),'updated_at'=>now()]);
        $serial='PAY-TEST-'.bin2hex(random_bytes(4));
        $paymentId=(int)DB::table('payments')->insertGetId(['serial_number'=>$serial,'user_id'=>$userId,'service_request_id'=>$requestId,'amount_egp'=>250,'payment_method'=>'kashier_gateway','status'=>'approved','source'=>'gateway','payment_stage'=>'deposit','provider'=>'kashier','provider_reference'=>'TX-REFUND-TEST','created_at'=>now(),'reviewed_at'=>now()]);
        $admin=$this->loginSuperAdmin();
        $admin['auth']->getJson('/api/v1/admin/payments?status=paid&paginate=1&search='.$serial)->assertOk()
            ->assertJsonPath('data.items.0.serialNumber',$serial)
            ->assertJsonPath('data.items.0.status','paid');
        $admin['auth']->postJson("/api/v1/admin/payments/{$paymentId}/refund",['amountEgp'=>250,'reason'=>'اختبار عدم إتاحة الاسترداد قبل ربط المزود'])
            ->assertStatus(501)
            ->assertJsonPath('code','REFUND_PROVIDER_NOT_CONFIGURED')
            ->assertJsonPath('details.available',false);
        $this->assertSame('approved',DB::table('payments')->where('id',$paymentId)->value('status'));
    }

    public function test_notification_importance_routes_email_only_for_important_events(): void
    {
        $auth=$this->registerAndVerifyClient();$userId=(int)$auth->getJson('/api/v1/users/profile')->assertOk()->json('data.id');
        $outboxBefore=DB::table('notification_outbox')->count();$notifications=app(NotificationService::class);
        $notifications->notify($userId,'routine_test','تحديث عادي','تحديث داخل الحساب فقط','/requests');
        $notifications->notify($userId,'important_test','تحديث مهم','يلزم إخطار العميل بالبريد','/payments',[],'important');
        $this->assertSame($outboxBefore+1,DB::table('notification_outbox')->count());
        $auth->getJson('/api/v1/notifications')->assertOk()
            ->assertJsonFragment(['type'=>'routine_test','importance'=>'normal'])
            ->assertJsonFragment(['type'=>'important_test','importance'=>'important']);
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

        $login = $this->withoutHeader('X-CSRF-Token')
            ->withUnencryptedCookie((string) config('zdraft.frontend_session_cookie'), '')
            ->withUnencryptedCookie((string) config('zdraft.frontend_csrf_cookie'), '')
            ->withUnencryptedCookie((string) config('zdraft.dashboard_session_cookie'), '')
            ->withUnencryptedCookie((string) config('zdraft.dashboard_csrf_cookie'), '')
            ->withHeader('Origin', (string) config('zdraft.dashboard_url'))
            ->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => $password,
        ]);
        $login->assertOk()->assertJsonPath('data.user.roles.0', 'super_admin');

        $sessionCookie = (string) config('zdraft.dashboard_session_cookie');
        $csrfCookie = (string) config('zdraft.dashboard_csrf_cookie');
        $session = $login->getCookie($sessionCookie, false)?->getValue();
        $csrf = $login->getCookie($csrfCookie, false)?->getValue();
        $this->assertNotEmpty($session);
        $this->assertNotEmpty($csrf);
        $login->assertJsonPath('data.csrfToken', $csrf);

        $auth = $this->withCredentials()
            ->withUnencryptedCookie($sessionCookie, $session)
            ->withUnencryptedCookie($csrfCookie, $csrf)
            ->withHeader('Origin', (string) config('zdraft.dashboard_url'))
            ->withHeader('X-CSRF-Token', $csrf);

        return ['auth' => $auth, 'id' => (int) $admin->id];
    }

    private function loginClient(string $email): self
    {
        $login = $this->withoutHeader('X-CSRF-Token')
            ->withUnencryptedCookie((string) config('zdraft.frontend_session_cookie'), '')
            ->withUnencryptedCookie((string) config('zdraft.frontend_csrf_cookie'), '')
            ->withUnencryptedCookie((string) config('zdraft.dashboard_session_cookie'), '')
            ->withUnencryptedCookie((string) config('zdraft.dashboard_csrf_cookie'), '')
            ->withHeader('Origin', (string) config('zdraft.frontend_url'))
            ->postJson('/api/v1/auth/login', [
                'email' => $email,
                'password' => 'StrongPass123',
            ]);
        $login->assertOk();
        $sessionCookie = (string) config('zdraft.frontend_session_cookie');
        $csrfCookie = (string) config('zdraft.frontend_csrf_cookie');
        $session = $login->getCookie($sessionCookie, false)?->getValue();
        $csrf = $login->getCookie($csrfCookie, false)?->getValue();
        $this->assertNotEmpty($session);
        $this->assertNotEmpty($csrf);
        return $this->withCredentials()
            ->withUnencryptedCookie($sessionCookie, $session)
            ->withUnencryptedCookie($csrfCookie, $csrf)
            ->withHeader('Origin', (string) config('zdraft.frontend_url'))
            ->withHeader('X-CSRF-Token', $csrf);
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

        $sessionCookie = (string) config('zdraft.frontend_session_cookie');
        $csrfCookie = (string) config('zdraft.frontend_csrf_cookie');
        $session = $register->getCookie($sessionCookie, false)?->getValue();
        $csrf = $register->getCookie($csrfCookie, false)?->getValue();
        $code = $register->json('data.debugVerificationCode');
        $this->assertNotEmpty($session);
        $this->assertNotEmpty($csrf);
        $register->assertJsonPath('data.csrfToken', $csrf);
        $this->assertMatchesRegularExpression('/^\d{6}$/', (string) $code);

        $auth = $this->withCredentials()
            ->withUnencryptedCookie($sessionCookie, $session)
            ->withUnencryptedCookie($csrfCookie, $csrf)
            ->withHeader('Origin', (string) config('zdraft.frontend_url'))
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
