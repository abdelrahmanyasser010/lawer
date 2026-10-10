<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $categories = [
            ['slug' => 'sale', 'name_ar' => 'بيع', 'description' => 'عقود بيع العقارات والمنقولات.', 'sort_order' => 10],
            ['slug' => 'rental', 'name_ar' => 'إيجار', 'description' => 'عقود إيجار الوحدات السكنية والتجارية.', 'sort_order' => 20],
            ['slug' => 'services', 'name_ar' => 'خدمات', 'description' => 'عقود الخدمات والعمل الحر.', 'sort_order' => 30],
        ];

        foreach ($categories as $category) {
            DB::table('contract_template_categories')->updateOrInsert(
                ['slug' => $category['slug']],
                [
                    'name_ar' => $category['name_ar'],
                    'description' => $category['description'],
                    'sort_order' => $category['sort_order'],
                    'is_active' => true,
                    'updated_at' => now(),
                    'created_at' => now(),
                ],
            );
        }

        $categoryIds = DB::table('contract_template_categories')
            ->whereIn('slug', ['sale', 'rental', 'services', 'general'])
            ->pluck('id', 'slug');

        $templateCategoryMap = [
            'apartment_sale' => 'sale',
            'rental' => 'rental',
            'freelancer' => 'services',
        ];

        foreach ($templateCategoryMap as $templateSlug => $categorySlug) {
            $categoryId = $categoryIds[$categorySlug] ?? null;
            if ($categoryId) {
                DB::table('contract_templates')
                    ->where('slug', $templateSlug)
                    ->update(['category_id' => $categoryId, 'updated_at' => now()]);
            }
        }

        $generalId = $categoryIds['general'] ?? null;
        if ($generalId && ! DB::table('contract_templates')->where('category_id', $generalId)->exists()) {
            DB::table('contract_template_categories')->where('id', $generalId)->update(['is_active' => false, 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        $generalId = DB::table('contract_template_categories')->where('slug', 'general')->value('id');
        $v1CategoryIds = DB::table('contract_template_categories')->whereIn('slug', ['sale', 'rental', 'services'])->pluck('id')->all();

        if ($generalId) {
            DB::table('contract_templates')
                ->whereIn('category_id', $v1CategoryIds)
                ->update(['category_id' => $generalId, 'updated_at' => now()]);

            DB::table('contract_template_categories')->where('id', $generalId)->update(['is_active' => true, 'updated_at' => now()]);
        }

        if ($generalId) {
            DB::table('contract_template_categories')->whereIn('slug', ['sale', 'rental', 'services'])->delete();
        }
    }
};
