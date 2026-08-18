<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // The product has no standalone consultation service. The old key was used
        // by the review flow, so preserve its contact number under the correct name.
        DB::statement(<<<'SQL'
INSERT INTO platform_settings(setting_key,setting_value_json,is_secret)
SELECT 'office.review_whatsapp_number',
       COALESCE(
         (SELECT setting_value_json FROM platform_settings WHERE setting_key='office.consultation_whatsapp_number'),
         (SELECT setting_value_json FROM platform_settings WHERE setting_key='office.whatsapp_number'),
         '""'::jsonb
       ),
       FALSE
ON CONFLICT (setting_key) DO NOTHING
SQL);

        DB::statement(<<<'SQL'
INSERT INTO platform_settings(setting_key,setting_value_json,is_secret)
SELECT 'services.contract_review.pending_payment_hold_minutes',
       COALESCE(
         (SELECT setting_value_json FROM platform_settings WHERE setting_key='services.consultation.pending_payment_hold_minutes'),
         '30'::jsonb
       ),
       FALSE
ON CONFLICT (setting_key) DO NOTHING
SQL);

        // Historical rows created through the mistakenly exposed consultation path
        // are review requests in this product. Normalize them before the new code runs.
        DB::statement(<<<'SQL'
UPDATE service_requests
SET request_type='contract_review',
    status=CASE WHEN status='meeting_scheduled' THEN 'new' ELSE status END,
    updated_at=CURRENT_TIMESTAMP
WHERE request_type='consultation'
SQL);

        DB::table('platform_settings')->whereIn('setting_key', [
            'services.consultation.fee_egp',
            'services.consultation.deposit_egp',
            'services.consultation.pending_payment_hold_minutes',
            'office.consultation_whatsapp_number',
        ])->delete();
    }

    public function down(): void
    {
        DB::statement(<<<'SQL'
INSERT INTO platform_settings(setting_key,setting_value_json,is_secret)
SELECT 'office.consultation_whatsapp_number', setting_value_json, FALSE
FROM platform_settings
WHERE setting_key='office.review_whatsapp_number'
ON CONFLICT (setting_key) DO NOTHING
SQL);
        DB::statement(<<<'SQL'
INSERT INTO platform_settings(setting_key,setting_value_json,is_secret)
SELECT 'services.consultation.pending_payment_hold_minutes', setting_value_json, FALSE
FROM platform_settings
WHERE setting_key='services.contract_review.pending_payment_hold_minutes'
ON CONFLICT (setting_key) DO NOTHING
SQL);
    }
};
