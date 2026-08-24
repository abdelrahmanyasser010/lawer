<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $specifications = [
            [
                'slug' => 'freelancer',
                'file' => 'freelancer.json',
                'version' => 18,
                'summary' => 'تحديث عقود الخدمات والعمل الحر (v18): توليد التفقيط وصياغة النسخ تلقائياً وتوحيد فحوصات التحقق.',
            ],
            [
                'slug' => 'apartment_sale',
                'file' => 'apartment_sale.json',
                'version' => 17,
                'summary' => 'تحديث عقود بيع الوحدات السكنية (v17): توليد التفقيط وصياغة النسخ تلقائياً وتوحيد حسابات الأقساط والدفعات.',
            ],
            [
                'slug' => 'rental',
                'file' => 'rental.json',
                'version' => 18,
                'summary' => 'تحديث عقود إيجار الوحدات (v18): توليد التفقيط وصياغة النسخ تلقائياً وإلغاء حقول المرفقات الزائدة وتوحيد خطوة الشهود.',
            ],
        ];

        $publications = [];
        foreach ($specifications as $specification) {
            $path = database_path('template-definitions/' . $specification['file']);
            if (!is_file($path)) {
                throw new RuntimeException('Missing canonical template definition: ' . $specification['file']);
            }

            $raw = file_get_contents($path);
            $definition = json_decode($raw ?: '', true, 512, JSON_THROW_ON_ERROR);
            if (($definition['slug'] ?? null) !== $specification['slug']) {
                throw new RuntimeException('Canonical template slug mismatch: ' . $specification['file']);
            }

            $canonicalVersion = (int) ($definition['version'] ?? 0);
            if ($canonicalVersion > $specification['version']) {
                continue;
            }
            if ($canonicalVersion !== $specification['version']) {
                throw new RuntimeException(sprintf(
                    'Canonical %s v%d definition is required by this migration.',
                    $specification['slug'],
                    $specification['version'],
                ));
            }

            $publications[] = $specification + ['raw' => $raw, 'definition' => $definition];
        }

        DB::transaction(function () use ($publications): void {
            foreach ($publications as $publication) {
                $template = DB::table('contract_templates')
                    ->where('slug', $publication['slug'])
                    ->lockForUpdate()
                    ->first();
                if (!$template) {
                    throw new RuntimeException('Contract template was not found: ' . $publication['slug']);
                }
                if ((int) ($template->template_version ?? 0) > $publication['version']) {
                    continue;
                }

                $version = DB::table('template_versions')
                    ->where('template_id', $template->id)
                    ->where('version_number', $publication['version'])
                    ->first();

                if ($version) {
                    $existing = is_string($version->definition_json)
                        ? json_decode($version->definition_json, true, 512, JSON_THROW_ON_ERROR)
                        : (array) $version->definition_json;
                    if ($existing != $publication['definition']) {
                        DB::table('template_versions')->where('id', $version->id)->update([
                            'definition_json' => $publication['raw'],
                            'updated_at' => now(),
                        ]);
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
                        'version_number' => $publication['version'],
                        'status' => 'published',
                        'definition_json' => $publication['raw'],
                        'change_summary' => $publication['summary'],
                        'legal_reference' => 'Automated words and clean witness steps across all 9 contracts approved 2026-08-24',
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
                    ->where('version_number', '<', $publication['version'])
                    ->update(['status' => 'archived', 'updated_at' => now()]);

                DB::table('contract_templates')->where('id', $template->id)->update([
                    'name_ar' => (string) ($publication['definition']['nameAr'] ?? $template->name_ar),
                    'description' => (string) ($publication['definition']['description'] ?? $template->description),
                    'template_version' => $publication['version'],
                    'current_published_version_id' => $versionId,
                    'updated_at' => now(),
                ]);

                // Update active drafts to point to the latest published template version
                DB::table('contracts')
                    ->where('template_id', $template->id)
                    ->whereIn('status', ['draft', 'pending_payment'])
                    ->update([
                        'template_version_id' => $versionId,
                        'updated_at' => now(),
                    ]);

                DB::table('contract_versions')
                    ->whereIn('contract_id', function ($query) use ($template) {
                        $query->select('id')
                            ->from('contracts')
                            ->where('template_id', $template->id)
                            ->whereIn('status', ['draft', 'pending_payment']);
                    })
                    ->where('status', 'draft')
                    ->update([
                        'template_version_id' => $versionId,
                    ]);
            }
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Template publication rollback is intentionally disabled.');
    }
};
