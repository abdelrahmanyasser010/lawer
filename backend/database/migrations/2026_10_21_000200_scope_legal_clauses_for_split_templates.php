<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $splitSlugs = [
        'sale_preliminary',
        'sale_registrable',
        'sale_inherited',
        'rental_residential',
        'rental_commercial',
        'rental_administrative',
        'services_visual_identity',
        'services_website_development',
        'services_social_media',
    ];

    public function up(): void
    {
        DB::transaction(function (): void {
            $templates = DB::table('contract_templates')
                ->whereIn('slug', $this->splitSlugs)
                ->get();

            foreach ($templates as $template) {
                $versions = DB::table('template_versions')
                    ->where('template_id', $template->id)
                    ->get();

                foreach ($versions as $version) {
                    $definition = is_string($version->definition_json)
                        ? json_decode($version->definition_json, true)
                        : (array) $version->definition_json;

                    if (! is_array($definition) || empty($definition['variants']) || empty($definition['legalClauses'])) {
                        continue;
                    }

                    // Collect all clause keys required by variants
                    $neededKeys = [];
                    foreach ($definition['variants'] as $variant) {
                        foreach ($variant['requiredClauseKeys'] ?? [] as $k) {
                            $neededKeys[] = (string) $k;
                        }
                    }

                    // Collect all clause keys required by optional clauses
                    foreach ($definition['optionalClauses'] ?? [] as $optional) {
                        foreach ($optional['legalClauseKeys'] ?? [] as $k) {
                            $neededKeys[] = (string) $k;
                        }
                    }

                    $neededKeysMap = array_fill_keys(array_unique($neededKeys), true);

                    // Filter legalClauses strictly to clauses needed by this template
                    $scopedClauses = array_values(array_filter(
                        $definition['legalClauses'],
                        fn ($clause) => isset($neededKeysMap[(string) ($clause['key'] ?? '')])
                    ));

                    // Only update if there is a reduction in clauses
                    if (count($scopedClauses) < count($definition['legalClauses']) && count($scopedClauses) > 0) {
                        $definition['legalClauses'] = $scopedClauses;

                        DB::table('template_versions')
                            ->where('id', $version->id)
                            ->update([
                                'definition_json' => json_encode($definition, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                                'updated_at' => now(),
                            ]);
                    }
                }
            }
        });
    }

    public function down(): void
    {
        // No-op: scoped clauses represent the correct isolated model for each contract type.
    }
};
