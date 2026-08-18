<?php
namespace App\Services;
use Illuminate\Support\Facades\DB;
final class NotificationService
{
    public function email(string $recipient, string $templateKey, string $subject, array $payload = []): void
    {
        DB::insert(
            "INSERT INTO notification_outbox (channel,recipient,template_key,subject,payload_json,status) VALUES ('email',?,?,?,?::jsonb,'pending')",
            [$recipient, $templateKey, $subject, json_encode($payload, JSON_UNESCAPED_UNICODE)]
        );
    }
    public function notify(int $recipientUserId, string $type, string $title, string $message, ?string $actionUrl = null, array $payload = [], bool $sendEmail = true): void
    {
        DB::insert(
            'INSERT INTO dashboard_notifications (recipient_user_id,notification_type,title,message,action_url,payload_json) VALUES (?,?,?,?,?,?::jsonb)',
            [$recipientUserId,$type,$title,$message,$actionUrl,json_encode($payload, JSON_UNESCAPED_UNICODE)]
        );
        if (!$sendEmail) return;
        $recipient = DB::selectOne(
            "SELECT u.name,u.email,u.email_verified_at,EXISTS(SELECT 1 FROM staff_profiles sp WHERE sp.user_id=u.id AND sp.staff_status='active') AS is_staff FROM users u WHERE u.id=? AND u.status='active' LIMIT 1",
            [$recipientUserId]
        );
        if (!$recipient || !$recipient->email || !$recipient->email_verified_at) return;
        $absolute = $actionUrl;
        if ($absolute && !preg_match('~^https?://~i', $absolute)) {
            $base = $recipient->is_staff ? config('zdraft.dashboard_url') : config('zdraft.frontend_url');
            $absolute = rtrim($base, '/').'/'.ltrim($absolute, '/');
        }
        $this->email($recipient->email, 'system_notification', $title, array_merge($payload, [
            'name' => $recipient->name, 'title' => $title, 'message' => $message,
            'actionUrl' => $absolute, 'notificationType' => $type,
        ]));
    }
    public function notifySuperAdmins(string $type, string $title, string $message, ?string $actionUrl = null, array $payload = [], ?int $excludeUserId = null): void
    {
        $admins = DB::select(
            "SELECT DISTINCT u.id FROM users u JOIN staff_profiles sp ON sp.user_id=u.id JOIN staff_role_assignments sra ON sra.user_id=u.id JOIN roles r ON r.id=sra.role_id WHERE r.role_key='super_admin' AND u.status='active' AND sp.staff_status='active' AND (?::bigint IS NULL OR u.id<>?)",
            [$excludeUserId,$excludeUserId]
        );
        foreach ($admins as $admin) $this->notify((int) $admin->id, $type, $title, $message, $actionUrl, $payload);
    }
}
