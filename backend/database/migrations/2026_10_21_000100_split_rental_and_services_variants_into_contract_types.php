<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $splitRentalTemplates = [
        'residential_lease' => [
            'slug' => 'rental_residential',
            'name_ar' => 'عقد إيجار سكني',
        ],
        'commercial_lease' => [
            'slug' => 'rental_commercial',
            'name_ar' => 'عقد إيجار تجاري',
        ],
        'administrative_lease' => [
            'slug' => 'rental_administrative',
            'name_ar' => 'عقد إيجار إداري',
        ],
    ];

    private array $splitServicesTemplates = [
        'visual_identity_design' => [
            'slug' => 'services_visual_identity',
            'name_ar' => 'عقد تصميم الهوية البصرية',
        ],
        'website_development' => [
            'slug' => 'services_website_development',
            'name_ar' => 'عقد تطوير موقع إلكتروني',
        ],
        'social_media_management' => [
            'slug' => 'services_social_media',
            'name_ar' => 'عقد إدارة حسابات ومنصات التواصل الاجتماعي',
        ],
    ];

    public function up(): void
    {
        DB::transaction(function (): void {
            $rentalCategoryId = DB::table('contract_template_categories')->where('slug', 'rental')->value('id');
            $servicesCategoryId = DB::table('contract_template_categories')->where('slug', 'services')->value('id');

            $this->splitTemplate('rental', $rentalCategoryId, $this->splitRentalTemplates);
            $this->splitTemplate('freelancer', $servicesCategoryId, $this->splitServicesTemplates);

            // Also ensure sale templates have their pricing copied over if not already present
            $saleTemplates = [
                'sale_preliminary' => 'preliminary_sale',
                'sale_registrable' => 'registrable_sale',
                'sale_inherited' => 'inherited_sale',
            ];
            foreach ($saleTemplates as $saleSlug => $variantKey) {
                $this->copyPricing('apartment_sale', $saleSlug, $variantKey);
            }
        });
    }

    public function down(): void
    {
        DB::transaction(function (): void {
            $allSplit = array_merge(array_values($this->splitRentalTemplates), array_values($this->splitServicesTemplates));
            foreach ($allSplit as $templateData) {
                $templateId = DB::table('contract_templates')->where('slug', $templateData['slug'])->value('id');
                if (!$templateId) {
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
                ->whereIn('slug', ['rental', 'freelancer'])
                ->update(['is_active' => true, 'updated_at' => now()]);
        });
    }

    private function splitTemplate(string $sourceSlug, ?int $categoryId, array $splitMap): void
    {
        $sourceTemplate = DB::table('contract_templates')->where('slug', $sourceSlug)->first();
        if (!$categoryId || !$sourceTemplate || !$sourceTemplate->current_published_version_id) {
            return;
        }

        $sourceVersion = DB::table('template_versions')
            ->where('id', $sourceTemplate->current_published_version_id)
            ->where('template_id', $sourceTemplate->id)
            ->first();

        if (!$sourceVersion) {
            return;
        }

        $sourceDefinition = $this->definition($sourceVersion->definition_json);

        foreach ($splitMap as $variantKey => $templateData) {
            $variant = $this->findVariant($sourceDefinition, $variantKey);
            if (!$variant) {
                continue;
            }

            $templateId = DB::table('contract_templates')->where('slug', $templateData['slug'])->value('id');
            $description = (string) ($variant['description'] ?? $sourceTemplate->description ?? '');

            if (!$templateId) {
                $templateId = DB::table('contract_templates')->insertGetId([
                    'name' => $templateData['name_ar'],
                    'name_ar' => $templateData['name_ar'],
                    'slug' => $templateData['slug'],
                    'description' => $description,
                    'price_egp' => 0,
                    'icon' => $sourceTemplate->icon ?? null,
                    'is_active' => true,
                    'template_version' => 1,
                    'category_id' => $categoryId,
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
                    'category_id' => $categoryId,
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
                'change_summary' => 'فصل نوع العقد كنوع مستقل تحت فئته',
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

            $this->copyPricing($sourceSlug, $templateData['slug'], $variantKey);
        }

        DB::table('contract_templates')
            ->where('slug', $sourceSlug)
            ->update(['is_active' => false, 'updated_at' => now()]);
    }

    private function copyPricing(string $sourceSlug, string $newSlug, string $variantKey): void
    {
        $prefixes = [
            'pricing.contracts.self_service',
            'pricing.contracts.lawyer_assisted',
            'pricing.contracts.lawyer_review_add_on',
        ];

        foreach ($prefixes as $prefix) {
            $sourceKey = "{$prefix}.{$sourceSlug}.{$variantKey}";
            $targetKey = "{$prefix}.{$newSlug}.{$variantKey}";

            $sourceSetting = DB::table('platform_settings')->where('setting_key', $sourceKey)->first();
            if ($sourceSetting) {
                DB::table('platform_settings')->updateOrInsert(
                    ['setting_key' => $targetKey],
                    [
                        'setting_value_json' => $sourceSetting->setting_value_json,
                        'is_secret' => false,
                        'updated_by' => $sourceSetting->updated_by ?? null,
                        'updated_at' => now(),
                    ]
                );
            }
        }
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
