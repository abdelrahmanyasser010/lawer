<?php
namespace App\Support;
use Illuminate\Support\Facades\DB;
final class UserPresenter
{
    public static function access(int $userId): array
    {
        $rows = DB::select(
            "SELECT COALESCE(array_agg(DISTINCT r.role_key) FILTER (WHERE r.role_key IS NOT NULL), '{}') AS roles,
                    COALESCE(array_agg(DISTINCT p.permission_key) FILTER (WHERE p.permission_key IS NOT NULL), '{}') AS permissions,
                    sp.password_change_required
             FROM users u
             LEFT JOIN staff_profiles sp ON sp.user_id=u.id
             LEFT JOIN staff_role_assignments sra ON sra.user_id=u.id
             LEFT JOIN roles r ON r.id=sra.role_id
             LEFT JOIN role_permissions rp ON rp.role_id=r.id
             LEFT JOIN permissions p ON p.id=rp.permission_id
             WHERE u.id=? GROUP BY u.id,sp.password_change_required",
            [$userId]
        );
        if (!$rows) return ['roles' => ['customer'], 'permissions' => [], 'password_change_required' => false];
        return [
            'roles' => self::pgArray($rows[0]->roles ?? '{}') ?: ['customer'],
            'permissions' => self::pgArray($rows[0]->permissions ?? '{}'),
            'password_change_required' => (bool) ($rows[0]->password_change_required ?? false),
        ];
    }
    public static function make(object|array $row, ?array $access = null): array
    {
        $r = (array) $row;
        $access ??= self::access((int) $r['id']);
        return [
            'id' => (int) $r['id'],
            'publicId' => $r['public_id'] ?? null,
            'name' => $r['name'],
            'email' => $r['email'],
            'accountType' => $r['account_type'] ?? 'individual',
            'companyName' => $r['company_name'] ?? null,
            'phone' => $r['phone'] ?? null,
            'whatsappNumber' => $r['whatsapp_number'] ?? null,
            'emailVerified' => !empty($r['email_verified_at']),
            'status' => $r['status'] ?? 'active',
            'roles' => $access['roles'],
            'permissions' => $access['permissions'],
            'passwordChangeRequired' => (bool) $access['password_change_required'],
        ];
    }
    private static function pgArray(mixed $value): array
    {
        if (is_array($value)) return $value;
        if (!is_string($value) || $value === '{}' || $value === '') return [];
        return str_getcsv(trim($value, '{}'));
    }
}
