<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $row = DB::table('platform_settings')->where('setting_key', 'customer_portal.communication_channels')->first();
        $current = $row ? (is_string($row->setting_value_json ?? null) ? json_decode($row->setting_value_json, true) : ($row->setting_value_json ?? [])) : [];
        $channels = array_values(array_intersect(is_array($current) ? $current : [], ['zoom', 'whatsapp']));
        if (!$channels) $channels = ['zoom', 'whatsapp'];
        DB::statement(
            'INSERT INTO platform_settings(setting_key,setting_value_json,is_secret) VALUES (?,?::jsonb,FALSE) ON CONFLICT (setting_key) DO UPDATE SET setting_value_json=EXCLUDED.setting_value_json,updated_at=CURRENT_TIMESTAMP',
            ['customer_portal.communication_channels', json_encode($channels, JSON_UNESCAPED_UNICODE)]
        );
    }

    public function down(): void
    {
        // لا نعيد قناة المكتب تلقائيًا حتى لا نغيّر إعدادات التشغيل الحالية عند rollback.
    }
};
