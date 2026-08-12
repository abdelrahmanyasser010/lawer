<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $files = glob(database_path('template-definitions/*.json')) ?: [];
        foreach ($files as $path) {
            $raw = file_get_contents($path);
            $definition = json_decode($raw ?: '', true, 512, JSON_THROW_ON_ERROR);
            $slug = (string) ($definition['slug'] ?? '');
            $version = (int) ($definition['version'] ?? 0);
            if ($slug === '' || $version < 1) {
                throw new RuntimeException("Invalid template definition: {$path}");
            }

            $template = DB::table('contract_templates')->where('slug', $slug)->first();
            if (!$template) {
                throw new RuntimeException("Contract template not found for {$slug}");
            }

            $versionId = DB::table('template_versions')
                ->where('template_id', $template->id)
                ->where('version_number', $version)
                ->value('id');

            if (!$versionId) {
                $versionId = DB::table('template_versions')->insertGetId([
                    'template_id' => $template->id,
                    'version_number' => $version,
                    'status' => 'published',
                    'definition_json' => $raw,
                    'change_summary' => 'تحديث رحلة اختيار العقود وإضافة تاريخ العقد والمحكمة والملاحق اليدوية',
                    'legal_reference' => 'Phase 1 customer contract flow hardening',
                    'effective_from' => now(),
                    'published_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('template_versions')->where('id', $versionId)->update([
                    'definition_json' => $raw,
                    'status' => 'published',
                    'published_at' => DB::raw('COALESCE(published_at, CURRENT_TIMESTAMP)'),
                    'updated_at' => now(),
                ]);
            }

            DB::table('template_versions')
                ->where('template_id', $template->id)
                ->where('id', '<>', $versionId)
                ->where('status', 'published')
                ->update(['status' => 'archived', 'updated_at' => now()]);

            DB::table('contract_templates')->where('id', $template->id)->update([
                'name_ar' => (string) $definition['nameAr'],
                'description' => (string) $definition['description'],
                'template_version' => $version,
                'current_published_version_id' => $versionId,
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        throw new RuntimeException('Template publication rollback is intentionally disabled. Restore from a verified backup instead.');
    }
};
