<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("INSERT INTO platform_settings(setting_key,setting_value_json,is_secret) SELECT 'services.contract_review.fee_egp',COALESCE((SELECT setting_value_json FROM platform_settings WHERE setting_key='services.consultation.fee_egp'),'300'::jsonb),FALSE ON CONFLICT (setting_key) DO NOTHING");
    }

    public function down(): void
    {
        DB::table('platform_settings')->where('setting_key','services.contract_review.fee_egp')->delete();
    }
};
