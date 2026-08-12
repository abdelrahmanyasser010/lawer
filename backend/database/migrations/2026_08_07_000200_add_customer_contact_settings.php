<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
    public function up(): void
    {
        DB::statement("INSERT INTO platform_settings(setting_key,setting_value_json,is_secret) SELECT 'office.consultation_whatsapp_number',COALESCE((SELECT setting_value_json FROM platform_settings WHERE setting_key='office.whatsapp_number'),'\"\"'::jsonb),FALSE ON CONFLICT (setting_key) DO NOTHING");
        DB::statement("INSERT INTO platform_settings(setting_key,setting_value_json,is_secret) SELECT 'office.support_whatsapp_number',COALESCE((SELECT setting_value_json FROM platform_settings WHERE setting_key='office.whatsapp_number'),'\"\"'::jsonb),FALSE ON CONFLICT (setting_key) DO NOTHING");
        DB::statement("INSERT INTO platform_settings(setting_key,setting_value_json,is_secret) VALUES ('office.support_phone','\"\"'::jsonb,FALSE) ON CONFLICT (setting_key) DO NOTHING");
        DB::statement("INSERT INTO platform_settings(setting_key,setting_value_json,is_secret) SELECT 'services.consultation.fee_egp',COALESCE((SELECT setting_value_json FROM platform_settings WHERE setting_key='services.consultation.deposit_egp'),'100'::jsonb),FALSE ON CONFLICT (setting_key) DO NOTHING");
    }
    public function down(): void
    {
        DB::table('platform_settings')->whereIn('setting_key',['office.consultation_whatsapp_number','office.support_whatsapp_number','office.support_phone','services.consultation.fee_egp'])->delete();
    }
};
