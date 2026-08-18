<?php
namespace App\Services;

use App\Exceptions\ApiException;

final class ServiceRequestWorkflow
{
    private const STAFF_TRANSITIONS = [
        'contract_review' => [
            'awaiting_payment' => ['cancelled'],
            'new' => ['assigned','in_progress','awaiting_client_info','cancelled'],
            'assigned' => ['in_progress','awaiting_client_info','cancelled'],
            'awaiting_client_info' => ['new','assigned','in_progress','cancelled'],
            'in_progress' => ['client_review','awaiting_client_info','cancelled'],
            'client_review' => ['revision_requested','completed','cancelled'],
            'revision_requested' => ['in_progress','client_review','cancelled'],
        ],
        'contract_drafting' => [
            'awaiting_payment' => ['cancelled'],
            'new' => ['assigned','in_progress','awaiting_client_info','cancelled'],
            'assigned' => ['in_progress','awaiting_client_info','cancelled'],
            'awaiting_client_info' => ['new','assigned','in_progress','cancelled'],
            'in_progress' => ['client_review','awaiting_client_info','cancelled'],
            'client_review' => ['revision_requested','completed','cancelled'],
            'revision_requested' => ['in_progress','client_review','cancelled'],
        ],
    ];

    public function allowedStaffTransitions(string $type, string $status): array
    {
        return self::STAFF_TRANSITIONS[$type][$status] ?? [];
    }

    public function assertStaffTransition(string $type, string $from, string $to): void
    {
        if ($from === $to) throw new ApiException(409,'اختر حالة جديدة مختلفة عن الحالة الحالية','SERVICE_REQUEST_STATUS_UNCHANGED');
        if (!in_array($to,$this->allowedStaffTransitions($type,$from),true)) {
            throw new ApiException(409,"لا يمكن نقل طلب {$type} من {$from} إلى {$to}",'INVALID_SERVICE_REQUEST_STATUS_TRANSITION',['requestType'=>$type,'from'=>$from,'to'=>$to,'allowed'=>$this->allowedStaffTransitions($type,$from)]);
        }
    }

    public function supportsBooking(string $type): bool
    {
        return $type === 'contract_review';
    }

    public function assertMeetingAllowed(string $type, string $status): void
    {
        if (!$this->supportsBooking($type)) throw new ApiException(409,'هذا النوع من الطلبات لا يستخدم جدول مواعيد مراجعة العقود','MEETING_NOT_SUPPORTED');
        if (!in_array($status,['new','assigned','awaiting_client_info','in_progress','client_review','revision_requested'],true)) {
            throw new ApiException(409,'لا يمكن تحديد موعد لمراجعة العقد في حالتها الحالية','MEETING_NOT_ALLOWED',['status'=>$status]);
        }
    }

    public function assertDeliverableAllowed(string $type, string $status): void
    {
        if (!in_array($status,['in_progress','revision_requested','client_review'],true)) {
            throw new ApiException(409,'لا يمكن نشر ملف للعميل في حالة الطلب الحالية','DELIVERABLE_NOT_ALLOWED',['requestType'=>$type,'status'=>$status]);
        }
    }

    public function assertLinkContractAllowed(string $type, string $status): void
    {
        if ($type !== 'contract_drafting') throw new ApiException(409,'ربط عقد متاح فقط لطلبات إعداد عقد بواسطة محامٍ','LINK_CONTRACT_NOT_SUPPORTED');
        if (!in_array($status,['new','assigned','in_progress'],true)) throw new ApiException(409,'لا يمكن ربط عقد في حالة الطلب الحالية','LINK_CONTRACT_NOT_ALLOWED',['status'=>$status]);
    }
}
