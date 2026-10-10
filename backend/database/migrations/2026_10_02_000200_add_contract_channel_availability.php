<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
ALTER TABLE contract_templates
    ADD COLUMN IF NOT EXISTS self_service_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS lawyer_drafting_enabled BOOLEAN NOT NULL DEFAULT TRUE
SQL);

        DB::statement(<<<'SQL'
INSERT INTO platform_settings(setting_key, setting_value_json, is_secret)
VALUES
    ('services.self_service_lawyer_review.enabled', 'false'::jsonb, FALSE),
    ('services.self_service_lawyer_review.fee_egp', '0'::jsonb, FALSE)
ON CONFLICT (setting_key) DO NOTHING
SQL);
    }

    public function down(): void
    {
        DB::table('platform_settings')
            ->whereIn('setting_key', [
                'services.self_service_lawyer_review.enabled',
                'services.self_service_lawyer_review.fee_egp',
            ])
            ->delete();

        DB::statement(<<<'SQL'
ALTER TABLE contract_templates
    DROP COLUMN IF EXISTS lawyer_drafting_enabled,
    DROP COLUMN IF EXISTS self_service_enabled
SQL);
    }
};
