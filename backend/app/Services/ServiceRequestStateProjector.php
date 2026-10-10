<?php

namespace App\Services;

final class ServiceRequestStateProjector
{
    /**
     * Project internal workflow/payment data into a stable customer contract.
     *
     * @return array{
     *   customerFacingStatus:string,
     *   requiresCustomerAction:bool,
     *   nextCustomerAction:?array<string,mixed>,
     *   paymentStatus:string,
     *   deliveryStatus:string
     * }
     */
    public function project(
        int $id,
        string $requestType,
        string $status,
        array $metadata = [],
        ?string $latestPaymentStatus = null,
        float $approvedPaidEgp = 0.0,
        int $deliverablesCount = 0,
        ?string $requestPurpose = null,
        ?string $bookingStatus = null,
        ?string $currentDeliverableType = null,
        bool $currentDeliverableIsFinal = false,
        bool $hasLockedFinal = false,
    ): array {
        $total = max(0.0, (float) ($metadata['serviceTotalPriceEgp'] ?? $metadata['lawyerTotalPriceEgp'] ?? $metadata['expectedPaymentEgp'] ?? 0));
        $outstanding = max(0.0, $total - max(0.0, $approvedPaidEgp));
        $paymentStage = (string) ($metadata['paymentStage'] ?? '');
        $paymentStatus = $paymentStage === 'paid' ? 'paid' : $this->paymentStatus($total, $approvedPaidEgp, $latestPaymentStatus);
        $deliveryStatus = match (true) {
            $status === 'cancelled' => 'cancelled',
            $status === 'completed' => 'delivered',
            $hasLockedFinal => 'payment_locked',
            $status === 'client_review' => $deliverablesCount > 0 ? 'ready' : 'not_ready',
            default => 'not_ready',
        };

        $facingStatus = match ($status) {
            'awaiting_payment' => $paymentStatus === 'processing'
                ? 'جاري تأكيد الدفع'
                : ($paymentStage === 'balance' ? 'العمل مكتمل — مطلوب سداد المبلغ المتبقي' : 'مطلوب سداد الدفعة الأولى'),
            'new' => 'تم استلام طلبك',
            'assigned' => $requestType === 'contract_drafting'
                ? 'تم تعيين المحامي وبدأ تجهيز العقد'
                : ($requestType === 'self_service_lawyer_review' ? 'تم تعيين المحامي لمراجعة العقد قبل الإصدار'
                : ($requestPurpose === 'consultation' ? 'تم تعيين المحامي لدراسة استشارتك' : 'تم تعيين المحامي لمراجعة العقد')),
            'awaiting_client_info' => 'مطلوب استكمال بيانات الطلب',
            'in_progress' => $requestType === 'contract_drafting'
                ? 'المحامي بيجهز العقد'
                : ($requestType === 'self_service_lawyer_review' ? 'العقد عند المحامي للمراجعة'
                : ($requestPurpose === 'consultation' ? 'المحامي بيدرس استشارتك' : 'المحامي بيراجع العقد')),
            'client_review' => $requestType === 'contract_drafting'
                ? ($currentDeliverableIsFinal || $currentDeliverableType === 'final_document' ? 'النسخة النهائية جاهزة' : 'مسودة العقد جاهزة لمراجعتك')
                : ($requestType === 'self_service_lawyer_review' ? 'اكتملت مراجعة المحامي والعقد جاهز للإصدار'
                : ($requestPurpose === 'consultation' ? 'نتيجة الاستشارة جاهزة' : 'نتيجة مراجعة العقد جاهزة')),
            'revision_requested' => $requestType === 'contract_drafting' ? 'المحامي بيحدّث المسودة' : 'المحامي بيحدّث النتيجة',
            'completed' => $requestType === 'contract_drafting' ? 'تم تسليم العقد' : ($requestType === 'self_service_lawyer_review' ? 'اكتملت مراجعة المحامي' : 'تم تسليم نتيجة الخدمة'),
            'cancelled' => 'تم إلغاء الطلب',
            default => 'طلبك تحت المتابعة',
        };

        $action = null;
        if ($status === 'awaiting_payment' && $bookingStatus === 'expired') {
            $facingStatus = 'اختَر موعدًا جديدًا قبل الدفع';
            $action = [
                'key' => 'rebook',
                'type' => 'rebook',
                'label' => 'اختَر موعدًا جديدًا',
                'actionUrl' => "/requests/{$id}",
            ];
        } elseif ($status === 'awaiting_payment' && $latestPaymentStatus === 'needs_client_info') {
            $facingStatus = 'مطلوب استكمال بيانات الدفع';
            $action = [
                'key' => 'payment_information',
                'type' => 'payment_information',
                'label' => 'راجع بيانات الدفع',
                'actionUrl' => "/requests/{$id}",
            ];
        } elseif ($status === 'awaiting_payment' && $paymentStatus !== 'processing' && $outstanding > 0.009) {
            $isBalance = $paymentStage === 'balance';
            $action = [
                'key' => $isBalance ? 'pay_remaining' : 'pay_initial',
                'type' => 'pay',
                'label' => $isBalance ? 'ادفع المتبقي' : 'ادفع الدفعة الأولى',
                'actionUrl' => "/requests/{$id}",
                'description' => $isBalance
                    ? 'استكمل المبلغ المتبقي لإتاحة النسخة النهائية.'
                    : 'أكمل الدفع المطلوب لبدء تنفيذ الخدمة.',
            ];
        } elseif ($status === 'awaiting_client_info') {
            $action = [
                'key' => 'provide_information',
                'type' => 'provide_information',
                'label' => 'استكمل البيانات المطلوبة',
                'actionUrl' => "/requests/{$id}",
            ];
        } elseif ($status === 'client_review' && $deliverablesCount > 0) {
            $isDrafting = $requestType === 'contract_drafting';
            $isFinal = $currentDeliverableIsFinal || $currentDeliverableType === 'final_document';
            $action = [
                'key' => $isDrafting && !$isFinal ? 'review_draft' : 'view_result',
                'type' => $isDrafting && !$isFinal ? 'review_draft' : 'view_result',
                'label' => $isDrafting && !$isFinal ? 'راجع المسودة' : ($isDrafting ? 'اعرض النسخة النهائية' : 'اعرض النتيجة'),
                'actionUrl' => "/requests/{$id}#deliverables",
            ];
        }

        return [
            'customerFacingStatus' => $facingStatus,
            'requiresCustomerAction' => $action !== null,
            'nextCustomerAction' => $action,
            'paymentStatus' => $paymentStatus,
            'deliveryStatus' => $deliveryStatus,
        ];
    }

    private function paymentStatus(float $total, float $approved, ?string $latest): string
    {
        if (in_array($latest, ['refunded', 'refund_pending'], true)) {
            return (string) $latest;
        }
        if ($total <= 0.009) {
            return 'not_required';
        }
        if ($approved + 0.009 >= $total) {
            return 'paid';
        }
        if (in_array($latest, ['pending_verification', 'created', 'processing'], true)) {
            return 'processing';
        }
        if ($approved > 0.009) {
            return 'partially_paid';
        }

        return 'unpaid';
    }
}
