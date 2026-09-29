<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE IF NOT EXISTS contract_template_categories (
                id BIGSERIAL PRIMARY KEY,
                slug VARCHAR(80) NOT NULL UNIQUE,
                name_ar VARCHAR(150) NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                sort_order INT NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        SQL);
        DB::statement('ALTER TABLE contract_templates ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES contract_template_categories(id) ON DELETE SET NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_contract_templates_category ON contract_templates(category_id, is_active, id)');

        DB::statement("INSERT INTO contract_template_categories(slug,name_ar,description,sort_order) VALUES ('general','عقود عامة','التصنيف الافتراضي للقوالب الحالية.',0) ON CONFLICT (slug) DO NOTHING");
        DB::statement("UPDATE contract_templates SET category_id=(SELECT id FROM contract_template_categories WHERE slug='general') WHERE category_id IS NULL");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE contract_templates DROP COLUMN IF EXISTS category_id');
        DB::statement('DROP TABLE IF EXISTS contract_template_categories');
    }
};
