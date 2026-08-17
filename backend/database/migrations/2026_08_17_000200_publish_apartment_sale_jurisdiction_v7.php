<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $path = database_path('template-definitions/apartment_sale.json');
        if (!is_file($path)) {
            throw new RuntimeException('Missing canonical apartment_sale template definition.');
        }

        $raw = file_get_contents($path);
        $definition = json_decode($raw ?: '', true, 512, JSON_THROW_ON_ERROR);
        if (($definition['slug'] ?? null) !== 'apartment_sale' || (int)($definition['version'] ?? 0) !== 7) {
            throw new RuntimeException('Canonical apartment_sale v7 definition is required by this migration.');
        }

        DB::transaction(function () use ($raw, $definition): void {
            $template = DB::table('contract_templates')->where('slug', 'apartment_sale')->lockForUpdate()->first();
            if (!$template) {
                throw new RuntimeException('Apartment sale contract template was not found.');
            }
            if ((int)($template->template_version ?? 0) > 7) {
                return;
            }

            $version = DB::table('template_versions')
                ->where('template_id', $template->id)
                ->where('version_number', 7)
                ->first();

            if ($version) {
                $existing = is_string($version->definition_json)
                    ? json_decode($version->definition_json, true, 512, JSON_THROW_ON_ERROR)
                    : (array)$version->definition_json;
                $incoming = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
                if ($existing != $incoming) {
                    throw new RuntimeException('Apartment sale template version 7 already exists with a different immutable definition.');
                }
                $versionId = $version->id;
                DB::table('template_versions')->where('id', $versionId)->update([
                    'status' => 'published',
                    'published_at' => DB::raw('COALESCE(published_at, CURRENT_TIMESTAMP)'),
                    'updated_at' => now(),
                ]);
            } else {
                $versionId = DB::table('template_versions')->insertGetId([
                    'template_id' => $template->id,
                    'version_number' => 7,
                    'status' => 'published',
                    'definition_json' => $raw,
                    'change_summary' => 'إضافة اختيار المحكمة المختصة كحقل إلزامي وبند قانوني واضح في عقود بيع الوحدات السكنية.',
                    'legal_reference' => 'Apartment sale jurisdiction court field and clause approved 2026-08-17',
                    'effective_from' => now(),
                    'published_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('template_versions')
                ->where('template_id', $template->id)
                ->where('id', '<>', $versionId)
                ->where('status', 'published')
                ->where('version_number', '<', 7)
                ->update(['status' => 'archived', 'updated_at' => now()]);

            DB::table('contract_templates')->where('id', $template->id)->update([
                'name_ar' => (string)($definition['nameAr'] ?? $template->name_ar),
                'description' => (string)($definition['description'] ?? $template->description),
                'template_version' => 7,
                'current_published_version_id' => $versionId,
                'updated_at' => now(),
            ]);
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Template publication rollback is intentionally disabled. Restore a verified previous published version instead.');
    }
};
