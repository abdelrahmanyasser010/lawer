<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $path = database_path('template-definitions/rental.json');
        if (!is_file($path)) {
            throw new RuntimeException('Missing canonical template definition: rental.json');
        }

        $raw = file_get_contents($path);
        $definition = json_decode($raw ?: '', true, 512, JSON_THROW_ON_ERROR);
        if (($definition['slug'] ?? null) !== 'rental') {
            throw new RuntimeException('Canonical rental template slug mismatch.');
        }

        $targetVersion = 14;
        $canonicalVersion = (int) ($definition['version'] ?? 0);
        if ($canonicalVersion > $targetVersion) {
            return;
        }
        if ($canonicalVersion !== $targetVersion) {
            throw new RuntimeException('Canonical apartment_sale v14 definition is required by this migration.');
        }

        DB::transaction(function () use ($raw, $definition, $targetVersion): void {
            $template = DB::table('contract_templates')
                ->where('slug', 'rental')
                ->lockForUpdate()
                ->first();

            if (!$template) {
                throw new RuntimeException('Contract template was not found: apartment_sale');
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
                    throw new RuntimeException('rental template version 14 already exists with a different immutable definition.');
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
                    'change_summary' => 'مراجعة شاملة لعقود الإيجار السكني والتجاري والإداري: توحيد تعريف الأطراف والهوية، وربط وصف العين والعدادات والملحقات ومدة الإيجار والتسليم والتأمين والأجرة والسداد والزيادات والفسخ والإخطارات والاختصاص بكل موادها القانونية، مع منطق مستقل للمفروشات والحيوانات الأليفة في السكني، والنشاط واللافتات وضريبة القيمة المضافة في التجاري، وتجهيزات العين والضمانات في الإداري، وإغلاق تكرارات المصدر وإضافة Coverage Audit Fail-Closed.',
                    'legal_reference' => 'Reviewed against docs/legal-sources/rental/lease-residential-source.pdf, lease-commercial-source.pdf, lease-administrative-source.pdf and the corresponding supplied analysis reports; approved 2026-08-19',
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
