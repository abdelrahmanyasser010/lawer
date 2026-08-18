<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $path = database_path('template-definitions/freelancer.json');
        if (!is_file($path)) {
            throw new RuntimeException('Missing canonical freelancer template definition.');
        }

        $raw = file_get_contents($path);
        $definition = json_decode($raw ?: '', true, 512, JSON_THROW_ON_ERROR);
        if (($definition['slug'] ?? null) !== 'freelancer') {
            throw new RuntimeException('Canonical freelancer definition is invalid.');
        }
        // The canonical file advances with later publications. On a fresh install
        // shipping v7 or newer, let the later migration publish it instead of
        // failing while replaying this historical v6 migration.
        if ((int)($definition['version'] ?? 0) > 6) {
            return;
        }
        if ((int)($definition['version'] ?? 0) !== 6) {
            throw new RuntimeException('Freelancer v6 definition is required by this migration.');
        }

        DB::transaction(function () use ($raw): void {
            $template = DB::table('contract_templates')->where('slug', 'freelancer')->lockForUpdate()->first();
            if (!$template) {
                throw new RuntimeException('Freelancer contract template was not found.');
            }

            if ((int)($template->template_version ?? 0) > 6) {
                return;
            }

            $version = DB::table('template_versions')
                ->where('template_id', $template->id)
                ->where('version_number', 6)
                ->first();

            if ($version) {
                $existing = is_string($version->definition_json)
                    ? json_decode($version->definition_json, true, 512, JSON_THROW_ON_ERROR)
                    : (array)$version->definition_json;
                $incoming = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
                if ($existing != $incoming) {
                    throw new RuntimeException('Freelancer template version 6 already exists with a different immutable definition.');
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
                    'version_number' => 6,
                    'status' => 'published',
                    'definition_json' => $raw,
                    'change_summary' => 'مراجعة عقد إدارة منصات التواصل: نطاق الخدمة، الإلزام الشرطي، الإخطارات، المقابل المالي كتابةً، الجزاء الاتفاقي الشرطي عن التأخير، المحكمة، الشهود، والبند الضريبي الاختياري؛ مع تعطيل ملاحق السوشيال غير الموثقة بالمصادر المرفوعة.',
                    'legal_reference' => 'Social media management source PDF reviewed 2026-08-12; annex originals pending source reconciliation',
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
                ->where('version_number', '<', 6)
                ->update(['status' => 'archived', 'updated_at' => now()]);

            DB::table('contract_templates')->where('id', $template->id)->update([
                'template_version' => 6,
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
