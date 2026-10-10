<?php

namespace Tests\Unit;

use App\Services\ContractStateProjector;
use PHPUnit\Framework\TestCase;

final class ContractStateProjectorTest extends TestCase
{
    private ContractStateProjector $projector;

    protected function setUp(): void
    {
        parent::setUp();
        $this->projector=new ContractStateProjector();
    }

    public function test_draft_and_unpaid_contract_have_explicit_actions():void
    {
        $draft=$this->projector->project(10,'draft','rental',null,500);
        $payment=$this->projector->project(11,'pending_payment','rental',null,500);
        $this->assertSame('continue_contract',$draft['nextCustomerAction']['type']);
        $this->assertSame('/wizard/rental?contractId=10',$draft['nextCustomerAction']['actionUrl']);
        $this->assertSame('unpaid',$payment['paymentStatus']);
        $this->assertSame('pay',$payment['nextCustomerAction']['type']);
    }

    public function test_processing_payment_does_not_offer_duplicate_action():void
    {
        $state=$this->projector->project(12,'pending_payment','rental','pending_verification',500);
        $this->assertSame('processing',$state['paymentStatus']);
        $this->assertFalse($state['requiresCustomerAction']);
    }

    public function test_issued_pdf_has_download_action_and_delivery_state():void
    {
        $state=$this->projector->project(13,'issued','rental','approved',500,500,'ready');
        $this->assertSame('paid',$state['paymentStatus']);
        $this->assertSame('delivered',$state['deliveryStatus']);
        $this->assertSame('download',$state['nextCustomerAction']['type']);
    }

    public function test_lawyer_review_incomplete_suppresses_customer_review_action():void
    {
        $state=$this->projector->project(14,'client_review','rental','approved',800,800,null,true,true,'in_review');
        $this->assertSame('العقد عند المحامي للمراجعة',$state['customerFacingStatus']);
        $this->assertFalse($state['requiresCustomerAction']);
    }
}
