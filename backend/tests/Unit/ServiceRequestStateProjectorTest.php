<?php

namespace Tests\Unit;

use App\Services\ServiceRequestStateProjector;
use PHPUnit\Framework\TestCase;

final class ServiceRequestStateProjectorTest extends TestCase
{
    private ServiceRequestStateProjector $projector;

    protected function setUp(): void
    {
        parent::setUp();
        $this->projector = new ServiceRequestStateProjector();
    }

    public function test_initial_payment_is_an_explicit_customer_action(): void
    {
        $state = $this->projector->project(51, 'contract_review', 'awaiting_payment', [
            'serviceTotalPriceEgp' => 300,
            'paymentStage' => 'deposit',
        ], null, 0, 0, 'review');

        $this->assertSame('unpaid', $state['paymentStatus']);
        $this->assertSame('مطلوب سداد الدفعة الأولى', $state['customerFacingStatus']);
        $this->assertTrue($state['requiresCustomerAction']);
        $this->assertSame('pay_initial', $state['nextCustomerAction']['key']);
        $this->assertSame('pay', $state['nextCustomerAction']['type']);
    }

    public function test_processing_balance_does_not_offer_duplicate_payment(): void
    {
        $state = $this->projector->project(52, 'contract_drafting', 'awaiting_payment', [
            'serviceTotalPriceEgp' => 5000,
            'paymentStage' => 'balance',
        ], 'processing', 2000, 0, null, null, 'final_document', true, true);

        $this->assertSame('processing', $state['paymentStatus']);
        $this->assertSame('جاري تأكيد الدفع', $state['customerFacingStatus']);
        $this->assertFalse($state['requiresCustomerAction']);
        $this->assertNull($state['nextCustomerAction']);
        $this->assertSame('payment_locked', $state['deliveryStatus']);
    }

    public function test_expired_review_booking_takes_priority_over_payment(): void
    {
        $state = $this->projector->project(53, 'contract_review', 'awaiting_payment', [
            'expectedPaymentEgp' => 100,
            'paymentStage' => 'deposit',
        ], null, 0, 0, 'consultation', 'expired');

        $this->assertSame('اختَر موعدًا جديدًا قبل الدفع', $state['customerFacingStatus']);
        $this->assertSame('rebook', $state['nextCustomerAction']['type']);
    }

    public function test_consultation_in_progress_has_specific_customer_wording(): void
    {
        $state = $this->projector->project(54, 'contract_review', 'in_progress', [
            'serviceTotalPriceEgp' => 300,
        ], 'approved', 100, 0, 'consultation');

        $this->assertSame('المحامي بيدرس استشارتك', $state['customerFacingStatus']);
        $this->assertSame('partially_paid', $state['paymentStatus']);
        $this->assertFalse($state['requiresCustomerAction']);
    }

    public function test_draft_and_final_deliverables_have_different_actions(): void
    {
        $draft = $this->projector->project(55, 'contract_drafting', 'client_review', [], 'approved', 0, 1, null, null, 'draft');
        $final = $this->projector->project(55, 'contract_drafting', 'client_review', [], 'approved', 0, 1, null, null, 'final_document', true);

        $this->assertSame('مسودة العقد جاهزة لمراجعتك', $draft['customerFacingStatus']);
        $this->assertSame('review_draft', $draft['nextCustomerAction']['type']);
        $this->assertSame('النسخة النهائية جاهزة', $final['customerFacingStatus']);
        $this->assertSame('view_result', $final['nextCustomerAction']['type']);
    }

    public function test_completed_and_cancelled_delivery_states_are_explicit(): void
    {
        $completed = $this->projector->project(56, 'contract_review', 'completed', [], null, 0, 1, 'review');
        $cancelled = $this->projector->project(57, 'contract_review', 'cancelled', [], null, 0, 0, 'review');

        $this->assertSame('delivered', $completed['deliveryStatus']);
        $this->assertSame('تم تسليم نتيجة الخدمة', $completed['customerFacingStatus']);
        $this->assertSame('cancelled', $cancelled['deliveryStatus']);
        $this->assertSame('تم إلغاء الطلب', $cancelled['customerFacingStatus']);
    }
}
