<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $categoryIds = DB::table('contract_template_categories')
            ->whereIn('slug', ['sale', 'rental', 'services', 'general'])
            ->pluck('id', 'slug');

        $generalId = $categoryIds['general'] ?? null;
        if (! $generalId) {
            return;
        }

        $rules = [
            'sale' => ['بيع', 'sale'],
            'rental' => ['إيجار', 'ايجار', 'lease', 'rent', 'rental'],
            'services' => ['خدمات', 'خدمة', 'freelance', 'service'],
        ];

        $generalTemplates = DB::table('contract_templates')
            ->where('category_id', $generalId)
            ->select('id', 'slug', 'name_ar', 'description')
            ->get();

        foreach ($generalTemplates as $template) {
            $haystack = mb_strtolower(trim("{$template->slug} {$template->name_ar} {$template->description}"));
            foreach ($rules as $targetSlug => $needles) {
                $targetId = $categoryIds[$targetSlug] ?? null;
                if (! $targetId) {
                    continue;
                }

                foreach ($needles as $needle) {
                    if ($needle !== '' && str_contains($haystack, mb_strtolower($needle))) {
                        DB::table('contract_templates')
                            ->where('id', $template->id)
                            ->update(['category_id' => $targetId, 'updated_at' => now()]);
                        continue 3;
                    }
                }
            }
        }

        if (! DB::table('contract_templates')->where('category_id', $generalId)->exists()) {
            DB::table('contract_template_categories')
                ->where('id', $generalId)
                ->update(['is_active' => false, 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        $generalId = DB::table('contract_template_categories')->where('slug', 'general')->value('id');
        if ($generalId) {
            DB::table('contract_template_categories')
                ->where('id', $generalId)
                ->update(['is_active' => true, 'updated_at' => now()]);
        }
    }
};
