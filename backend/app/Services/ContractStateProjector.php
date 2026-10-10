<?php

namespace App\Services;

final class ContractStateProjector
{
    /** @return array{customerFacingStatus:string,requiresCustomerAction:bool,nextCustomerAction:?array<string,mixed>,paymentStatus:string,deliveryStatus:string} */
    public function project(
        int $id,
        string $status,
        string $templateSlug,
        ?string $latestPaymentStatus = null,
        float $priceEgp = 0.0,
        float $approvedPaidEgp = 0.0,
        ?string $pdfStatus = null,
        bool $editWindowActive = false,
        bool $lawyerReviewEnabled = false,
        ?string $lawyerReviewStatus = null,
    ): array {
        $paymentStatus = $this->paymentStatus($priceEgp, $approvedPaidEgp, $latestPaymentStatus);
        $deliveryStatus = match (true) {
            $status === 'cancelled' => 'cancelled',
            $status === 'issued' && $pdfStatus === 'ready' => 'delivered',
            $status === 'issued' => 'preparing',
            in_array($status, ['client_review','approved','locked'], true) => 'ready',
            default => 'not_ready',
        };

        $facing = match ($status) {
            'draft' => 'مسودة محفوظة — استكمل بيانات العقد',
            'pending_payment' => $paymentStatus === 'processing' ? 'جاري تأكيد الدفع' : 'مطلوب سداد قيمة العقد',
            'pending_review','assigned','in_progress' => $lawyerReviewEnabled ? 'العقد عند المحامي للمراجعة' : 'العقد تحت المراجعة الداخلية',
            'client_review' => $lawyerReviewEnabled && !in_array($lawyerReviewStatus, ['completed','approved'], true)
                ? 'العقد عند المحامي للمراجعة'
                : 'العقد جاهز لمراجعتك',
            'revision_requested' => 'يجري تنفيذ التعديلات على العقد',
            'approved','locked' => 'العقد جاهز للإصدار النهائي',
            'issued' => $pdfStatus === 'ready' ? 'تم إصدار العقد وهو جاهز للتنزيل' : 'تم إصدار العقد ويجري تجهيز الملف',
            'cancelled' => 'تم إلغاء العقد',
            default => 'العقد تحت المتابعة',
        };

        $action = null;
        if ($status === 'draft') {
            $action = ['key'=>'continue_contract','type'=>'continue_contract','label'=>'استكمل العقد','actionUrl'=>"/wizard/{$templateSlug}?contractId={$id}"];
        } elseif ($status === 'pending_payment' && $latestPaymentStatus === 'needs_client_info') {
            $facing = 'مطلوب استكمال بيانات الدفع';
            $action = ['key'=>'payment_information','type'=>'payment_information','label'=>'راجع بيانات الدفع','actionUrl'=>"/contract/{$id}"];
        } elseif ($status === 'pending_payment' && $paymentStatus !== 'processing') {
            $action = ['key'=>'pay_contract','type'=>'pay','label'=>'ادفع قيمة العقد','actionUrl'=>"/contract/{$id}"];
        } elseif ($status === 'client_review' && (!$lawyerReviewEnabled || in_array($lawyerReviewStatus, ['completed','approved'], true))) {
            $action = ['key'=>'review_contract','type'=>'review_contract','label'=>$editWindowActive?'راجع وعدّل العقد':'راجع العقد','actionUrl'=>"/contract/{$id}"];
        } elseif ($status === 'issued' && $pdfStatus === 'ready') {
            $action = ['key'=>'download_contract','type'=>'download','label'=>'نزّل العقد','actionUrl'=>"/contract/{$id}"];
        }

        return [
            'customerFacingStatus'=>$facing,
            'requiresCustomerAction'=>$action!==null,
            'nextCustomerAction'=>$action,
            'paymentStatus'=>$paymentStatus,
            'deliveryStatus'=>$deliveryStatus,
        ];
    }

    private function paymentStatus(float $total,float $approved,?string $latest):string
    {
        if(in_array($latest,['refunded','refund_pending'],true))return(string)$latest;
        if($total<=0.009)return'not_required';
        if($approved+0.009>=$total)return'paid';
        if(in_array($latest,['pending_verification','created','processing'],true))return'processing';
        if($approved>0.009)return'partially_paid';
        return'unpaid';
    }
}
