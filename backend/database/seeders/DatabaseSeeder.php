<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

final class DatabaseSeeder extends Seeder
{
    private const PERMISSIONS = [
        'dashboard.view' => 'عرض لوحة التحكم',
        'requests.view_all' => 'عرض كل طلبات الخدمات',
        'requests.view_assigned' => 'عرض طلبات الخدمات المسندة للحساب',
        'requests.assign' => 'إسناد الطلبات للمحامين',
        'requests.manage' => 'تحديث حالات طلبات الخدمات',
        'contracts.view_all' => 'عرض كل العقود',
        'contracts.view_assigned' => 'عرض العقود المسندة للحساب',
        'contracts.create_office' => 'إنشاء عقد من المكتب',
        'contracts.assign' => 'إسناد العقود',
        'contracts.manage_status' => 'تغيير حالة العقود',
        'contracts.edit_legal' => 'إنشاء إصدارات وتعديل العقود',
        'contracts.waive_payment' => 'إعفاء عقد من الدفع',
        'contracts.lock' => 'قفل النسخة القانونية',
        'contracts.issue' => 'إصدار العقد النهائي',
        'consultations.manage' => 'إدارة الاستشارات والمواعيد',
        'payments.review' => 'اعتماد ورفض المدفوعات',
        'clients.view' => 'عرض العملاء',
        'clients.manage' => 'إدارة حالات العملاء',
        'templates.view' => 'عرض القوالب وإصداراتها',
        'templates.edit' => 'إنشاء وتعديل مسودات القوالب',
        'templates.publish' => 'اعتماد ونشر إصدارات القوالب',
        'templates.manage' => 'صلاحية توافق قديمة لإدارة القوالب',
        'pricing.manage' => 'إدارة الأسعار',
        'team.manage' => 'إدارة فريق المكتب والصلاحيات',
        'reports.view' => 'عرض التقارير',
        'audit.view' => 'عرض سجل التدقيق',
        'settings.manage' => 'إدارة إعدادات المنصة',
        'attachments.view_all' => 'عرض مرفقات المكتب',
    ];

    private const ROLES = [
        'super_admin' => ['المشرف العام', '*'],
        'operations' => ['إدارة التشغيل', ['dashboard.view','requests.view_all','requests.assign','requests.manage','contracts.view_all','contracts.create_office','contracts.assign','contracts.manage_status','clients.view','clients.manage','payments.review','reports.view','attachments.view_all']],
        'lawyer' => ['محامٍ', ['dashboard.view','requests.view_assigned','requests.manage','contracts.view_assigned','contracts.create_office','contracts.manage_status','contracts.edit_legal','contracts.lock','consultations.manage','clients.view','attachments.view_all']],
        'finance' => ['الحسابات', ['dashboard.view','payments.review','clients.view','reports.view']],
        'support' => ['خدمة العملاء', ['dashboard.view','requests.view_all','requests.manage','contracts.view_all','clients.view','consultations.manage']],
        'template_manager' => ['مسؤول القوالب القانونية', ['dashboard.view','templates.view','templates.edit','contracts.view_all','audit.view']],
    ];

    public function run(): void
    {
        DB::transaction(function (): void {
            $this->seedPermissionsAndRoles();
            $adminId = $this->ensureSuperAdmin();
            $this->seedTemplateDefinitions($adminId);
        });
    }

    private function seedPermissionsAndRoles(): void
    {
        foreach (self::PERMISSIONS as $key => $name) {
            DB::statement(
                'INSERT INTO permissions(permission_key,name_ar) VALUES (?,?) ON CONFLICT(permission_key) DO UPDATE SET name_ar=EXCLUDED.name_ar',
                [$key, $name]
            );
        }
        foreach (self::ROLES as $roleKey => [$name, $permissionKeys]) {
            $role = DB::selectOne(
                'INSERT INTO roles(role_key,name_ar,is_system) VALUES (?,?,TRUE) ON CONFLICT(role_key) DO UPDATE SET name_ar=EXCLUDED.name_ar RETURNING id',
                [$roleKey, $name]
            );
            DB::delete('DELETE FROM role_permissions WHERE role_id=?', [$role->id]);
            $keys = $permissionKeys === '*' ? array_keys(self::PERMISSIONS) : $permissionKeys;
            foreach ($keys as $permissionKey) {
                DB::statement(
                    'INSERT INTO role_permissions(role_id,permission_id) SELECT ?,id FROM permissions WHERE permission_key=? ON CONFLICT DO NOTHING',
                    [$role->id, $permissionKey]
                );
            }
        }
    }

    private function ensureSuperAdmin(): int
    {
        $email = strtolower(trim((string) env('SUPER_ADMIN_EMAIL', '')));
        $password = (string) env('SUPER_ADMIN_PASSWORD', '');
        $name = trim((string) env('SUPER_ADMIN_NAME', 'Z draft Super Admin')) ?: 'Z draft Super Admin';

        $existing = DB::selectOne(
            "SELECT u.id FROM users u LEFT JOIN staff_role_assignments sra ON sra.user_id=u.id LEFT JOIN roles r ON r.id=sra.role_id WHERE r.role_key='super_admin' OR u.role='super_admin' ORDER BY u.id LIMIT 1"
        );
        if ($email === '' && $existing) return (int) $existing->id;
        if ($email === '' || strlen($password) < 12) {
            throw new RuntimeException('Set SUPER_ADMIN_EMAIL and a SUPER_ADMIN_PASSWORD of at least 12 characters before the first production seed.');
        }

        $user = DB::selectOne('SELECT id,password_hash FROM users WHERE lower(email)=lower(?) LIMIT 1', [$email]);
        if (!$user) {
            $publicId = 'STF-'.strtoupper(substr(hash('sha256', $email), 0, 12));
            $pubgId = 'ADM'.strtoupper(substr(hash('sha256', $email), 0, 7));
            $user = DB::selectOne(
                "INSERT INTO users(public_id,pubg_id,name,email,password_hash,account_type,status,email_verified_at,role,created_at,updated_at) VALUES (?,?,?,?,?,'individual','active',CURRENT_TIMESTAMP,'super_admin',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id,password_hash",
                [$publicId, $pubgId, $name, $email, Hash::make($password)]
            );
        } else {
            $updates = ['name' => $name, 'status' => 'active', 'role' => 'super_admin', 'email_verified_at' => DB::raw('COALESCE(email_verified_at,CURRENT_TIMESTAMP)'), 'updated_at' => now()];
            if (!$user->password_hash || filter_var(env('SUPER_ADMIN_RESET_PASSWORD', false), FILTER_VALIDATE_BOOL)) $updates['password_hash'] = Hash::make($password);
            DB::table('users')->where('id', $user->id)->update($updates);
        }

        $id = (int) $user->id;
        DB::table('staff_profiles')->updateOrInsert(
            ['user_id' => $id],
            ['staff_status' => 'active', 'job_title' => 'مالك النظام', 'password_change_required' => false, 'activated_at' => now(), 'updated_at' => now(), 'created_at' => now()]
        );
        $roleId = DB::table('roles')->where('role_key', 'super_admin')->value('id');
        DB::table('staff_role_assignments')->updateOrInsert(
            ['user_id' => $id, 'role_id' => $roleId],
            ['assigned_by' => $id, 'assigned_at' => now()]
        );
        return $id;
    }

    private function seedTemplateDefinitions(int $adminId): void
    {
        $files = glob(database_path('template-definitions/*.json')) ?: [];
        if (count($files) !== 3) throw new RuntimeException('Expected the three canonical template definition JSON files.');

        foreach ($files as $path) {
            $raw = file_get_contents($path);
            $definition = json_decode($raw ?: '', true, 512, JSON_THROW_ON_ERROR);
            foreach (['slug','nameAr','description','priceEgp','version','variants','legalClauses'] as $key) {
                if (!array_key_exists($key, $definition)) throw new RuntimeException("Invalid template definition {$path}: missing {$key}");
            }
            $template = DB::selectOne(
                "INSERT INTO contract_templates(name,name_ar,slug,description,price_egp,is_active,template_version,updated_at) VALUES (?,?,?,?,?,TRUE,?,CURRENT_TIMESTAMP) ON CONFLICT(slug) DO UPDATE SET name_ar=EXCLUDED.name_ar,description=EXCLUDED.description,price_egp=EXCLUDED.price_egp,is_active=TRUE,template_version=GREATEST(contract_templates.template_version,EXCLUDED.template_version),updated_at=CURRENT_TIMESTAMP RETURNING id",
                [$definition['slug'], $definition['nameAr'], $definition['slug'], $definition['description'], $definition['priceEgp'], $definition['version']]
            );
            $existing = DB::selectOne('SELECT id,status FROM template_versions WHERE template_id=? AND version_number=?', [$template->id, $definition['version']]);
            if (!$existing) {
                $existing = DB::selectOne(
                    "INSERT INTO template_versions(template_id,version_number,status,definition_json,change_summary,legal_reference,effective_from,created_by,approved_by,published_at) VALUES (?,?,'published',?::jsonb,?,?,CURRENT_TIMESTAMP,?,?,CURRENT_TIMESTAMP) RETURNING id,status",
                    [$template->id, $definition['version'], $raw, 'نقل تعريف القالب القانوني الكامل إلى Laravel', 'مصادر العقود والملاحق المعتمدة داخل محرك Z draft', $adminId, $adminId]
                );
            }
            if ($existing->status !== 'published') {
                DB::statement("UPDATE template_versions SET status='published',approved_by=?,published_at=COALESCE(published_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=?", [$adminId, $existing->id]);
            }
            DB::statement('UPDATE contract_templates SET current_published_version_id=? WHERE id=?', [$existing->id, $template->id]);
        }
    }
}
