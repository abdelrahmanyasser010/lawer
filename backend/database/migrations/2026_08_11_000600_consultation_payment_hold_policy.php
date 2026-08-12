<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("INSERT INTO platform_settings(setting_key,setting_value_json,is_secret) VALUES ('services.consultation.pending_payment_hold_minutes','30'::jsonb,FALSE) ON CONFLICT (setting_key) DO NOTHING");
        // Give pre-existing unpaid holds the same finite lifetime instead of allowing NULL expiry to block capacity forever.
        DB::statement("UPDATE consultation_bookings SET expires_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) + INTERVAL '30 minutes' WHERE status = 'pending_payment' AND expires_at IS NULL");
    }

    public function down(): void
    {
        DB::table('platform_settings')->where('setting_key','services.consultation.pending_payment_hold_minutes')->delete();
    }
};
