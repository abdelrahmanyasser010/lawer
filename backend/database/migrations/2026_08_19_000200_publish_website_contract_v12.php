<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $path = database_path('template-definitions/freelancer.json');
        if (!is_file($path)) {
            throw new RuntimeException('Missing canonical template definition: freelancer.json');
        }

        $raw = file_get_contents($path);
        $definition = json_decode($raw ?: '', true, 512, JSON_THROW_ON_ERROR);
        if (($definition['slug'] ?? null) !== 'freelancer') {
            throw new RuntimeException('Canonical freelancer template slug mismatch.');
        }

        $targetVersion = 12;
        $canonicalVersion = (int) ($definition['version'] ?? 0);
        if ($canonicalVersion > $targetVersion) {
            return;
        }
        if ($canonicalVersion !== $targetVersion) {
            throw new RuntimeException('Canonical freelancer v12 definition is required by this migration.');
        }

        DB::transaction(function () use ($raw, $definition, $targetVersion): void {
            $template = DB::table('contract_templates')
                ->where('slug', 'freelancer')
                ->lockForUpdate()
                ->first();

            if (!$template) {
                throw new RuntimeException('Contract template was not found: freelancer');
            }
            if ((int) ($template->template_version ?? 0) > $targetVersion) {
                return;
            }

            $version = DB::table('template_versions')
                ->where('template_id', $template->id)
                ->where('version_number', $targetVersion)
                ->first();

            if ($version) {
                $existing = is_string($version->definition_json)
                    ? json_decode($version->definition_json, true, 512, JSON_THROW_ON_ERROR)
                    : (array) $version->definition_json;

                if ($existing != $definition) {
                    throw new RuntimeException('freelancer template version 12 already exists with a different immutable definition.');
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
                    'version_number' => $targetVersion,
                    'status' => 'published',
                    'definition_json' => $raw,
                    'change_summary' => 'مراجعة شاملة لعقد تطوير الموقع الإلكتروني: ربط بيانات الأطراف والهوية والمشروع والمدة وبداية احتسابها والسداد والضمان والخدمات الخارجية والإخطارات والإنهاء والقوة القاهرة والمحكمة والرسوم داخل المواد القانونية، واستعادة المادة 11 وتوحيد أحكام Portfolio ومعايير القبول.',
                    'legal_reference' => 'Reviewed against عقد برمجة ويب سيت(1).pdf (22 pages), approved 2026-08-19',
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
                ->where('version_number', '<', $targetVersion)
                ->update(['status' => 'archived', 'updated_at' => now()]);

            DB::table('contract_templates')->where('id', $template->id)->update([
                'name_ar' => (string) ($definition['nameAr'] ?? $template->name_ar),
                'description' => (string) ($definition['description'] ?? $template->description),
                'template_version' => $targetVersion,
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
