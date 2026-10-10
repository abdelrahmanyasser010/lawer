<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $splitSaleTemplates = [
        'preliminary_sale' => [
            'slug' => 'sale_preliminary',
            'name_ar' => 'عقد بيع ابتدائي',
        ],
        'registrable_sale' => [
            'slug' => 'sale_registrable',
            'name_ar' => 'عقد بيع قابل للتسجيل بالشهر العقاري',
        ],
        'inherited_sale' => [
            'slug' => 'sale_inherited',
            'name_ar' => 'عقد بيع وحدة آلت بالميراث',
        ],
    ];

    public function up(): void
    {
        DB::transaction(function (): void {
            $saleCategoryId = DB::table('contract_template_categories')->where('slug', 'sale')->value('id');
            $sourceTemplate = DB::table('contract_templates')->where('slug', 'apartment_sale')->first();

            if (! $saleCategoryId || ! $sourceTemplate || ! $sourceTemplate->current_published_version_id) {
                return;
            }

            $sourceVersion = DB::table('template_versions')
                ->where('id', $sourceTemplate->current_published_version_id)
                ->where('template_id', $sourceTemplate->id)
                ->first();

            if (! $sourceVersion) {
                return;
            }

            $sourceDefinition = $this->definition($sourceVersion->definition_json);

            foreach ($this->splitSaleTemplates as $variantKey => $templateData) {
                $variant = $this->findVariant($sourceDefinition, $variantKey);
                if (! $variant) {
                    continue;
                }

                $templateId = DB::table('contract_templates')->where('slug', $templateData['slug'])->value('id');
                $description = (string) ($variant['description'] ?? $sourceTemplate->description ?? '');

                if (! $templateId) {
                    $templateId = DB::table('contract_templates')->insertGetId([
                        'name' => $templateData['name_ar'],
                        'name_ar' => $templateData['name_ar'],
                        'slug' => $templateData['slug'],
                        'description' => $description,
                        'price_egp' => 0,
                        'icon' => $sourceTemplate->icon ?? null,
                        'is_active' => true,
                        'template_version' => 1,
                        'category_id' => $saleCategoryId,
                        'self_service_enabled' => $sourceTemplate->self_service_enabled,
                        'lawyer_drafting_enabled' => $sourceTemplate->lawyer_drafting_enabled,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    DB::table('contract_templates')->where('id', $templateId)->update([
                        'name' => $templateData['name_ar'],
                        'name_ar' => $templateData['name_ar'],
                        'description' => $description,
                        'is_active' => true,
                        'template_version' => 1,
                        'category_id' => $saleCategoryId,
                        'self_service_enabled' => $sourceTemplate->self_service_enabled,
                        'lawyer_drafting_enabled' => $sourceTemplate->lawyer_drafting_enabled,
                        'updated_at' => now(),
                    ]);
                }

                DB::table('template_versions')->where('template_id', $templateId)->delete();

                $publishedDefinition = $this->singleVariantDefinition($sourceDefinition, $variant, $templateData, 1);
                $publishedVersionId = DB::table('template_versions')->insertGetId([
                    'template_id' => $templateId,
                    'version_number' => 1,
                    'status' => 'published',
                    'definition_json' => json_encode($publishedDefinition, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    'change_summary' => 'فصل نوع العقد من مجموعة عقود البيع القديمة',
                    'legal_reference' => $sourceVersion->legal_reference,
                    'effective_from' => $sourceVersion->effective_from,
                    'created_by' => $sourceVersion->created_by,
                    'approved_by' => $sourceVersion->approved_by,
                    'published_at' => $sourceVersion->published_at ?? now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $draftDefinition = $this->singleVariantDefinition($sourceDefinition, $variant, $templateData, 2);
                DB::table('template_versions')->insert([
                    'template_id' => $templateId,
                    'version_number' => 2,
                    'status' => 'draft',
                    'definition_json' => json_encode($draftDefinition, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    'change_summary' => 'مسودة تعديل بعد فصل نوع العقد',
                    'legal_reference' => $sourceVersion->legal_reference,
                    'effective_from' => $sourceVersion->effective_from,
                    'created_by' => $sourceVersion->created_by,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('contract_templates')->where('id', $templateId)->update([
                    'current_published_version_id' => $publishedVersionId,
                    'template_version' => 1,
                    'updated_at' => now(),
                ]);
            }

            DB::table('contract_templates')
                ->whereIn('slug', ['apartment_sale', '123'])
                ->update(['is_active' => false, 'updated_at' => now()]);
        });
    }

    public function down(): void
    {
        DB::transaction(function (): void {
            foreach ($this->splitSaleTemplates as $templateData) {
                $templateId = DB::table('contract_templates')->where('slug', $templateData['slug'])->value('id');
                if (! $templateId) {
                    continue;
                }

                if (DB::table('contracts')->where('template_id', $templateId)->exists()) {
                    DB::table('contract_templates')->where('id', $templateId)->update(['is_active' => false, 'updated_at' => now()]);
                    continue;
                }

                DB::table('template_versions')->where('template_id', $templateId)->delete();
                DB::table('contract_templates')->where('id', $templateId)->delete();
            }

            DB::table('contract_templates')
                ->whereIn('slug', ['apartment_sale', '123'])
                ->update(['is_active' => true, 'updated_at' => now()]);
        });
    }

    private function singleVariantDefinition(array $sourceDefinition, array $variant, array $templateData, int $version): array
    {
        $variantKey = (string) ($variant['key'] ?? '');
        $definition = $sourceDefinition;
        $definition['slug'] = $templateData['slug'];
        $definition['version'] = $version;
        $definition['nameAr'] = $templateData['name_ar'];
        $definition['description'] = (string) ($variant['description'] ?? $definition['description'] ?? '');
        $definition['variants'] = [$variant];
        $definition['optionalClauses'] = $this->optionalClausesForVariant($sourceDefinition['optionalClauses'] ?? [], $variantKey);

        return $definition;
    }

    private function optionalClausesForVariant(array $optionalClauses, string $variantKey): array
    {
        return array_values(array_map(
            function (array $optional) use ($variantKey): array {
                $optional['applicableVariantKeys'] = [$variantKey];
                return $optional;
            },
            array_filter($optionalClauses, function (array $optional) use ($variantKey): bool {
                $keys = $optional['applicableVariantKeys'] ?? [];
                return $keys === [] || in_array($variantKey, $keys, true);
            }),
        ));
    }

    private function findVariant(array $definition, string $variantKey): ?array
    {
        foreach (($definition['variants'] ?? []) as $variant) {
            if ((string) ($variant['key'] ?? '') === $variantKey) {
                return $variant;
            }
        }

        return null;
    }

    private function definition(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }

        return is_array($value) ? $value : (array) $value;
    }
};
