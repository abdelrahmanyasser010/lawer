<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS source VARCHAR(40) NOT NULL DEFAULT 'legacy_receipt',
    ADD COLUMN IF NOT EXISTS payment_stage VARCHAR(30),
    ADD COLUMN IF NOT EXISTS provider VARCHAR(60),
    ADD COLUMN IF NOT EXISTS provider_reference VARCHAR(255),
    ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(255),
    ADD COLUMN IF NOT EXISTS refunded_amount_egp DECIMAL(10,2) NOT NULL DEFAULT 0
SQL);
        DB::statement("UPDATE payments SET source='admin_manual_collection' WHERE receipt_attachment_id IS NULL AND reviewed_by_admin_id IS NOT NULL AND payment_method IN ('cash','bank_transfer','external_transfer')");
        DB::statement('CREATE INDEX IF NOT EXISTS idx_payments_source_stage ON payments(source,payment_stage,created_at DESC)');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_reference ON payments(provider,provider_reference) WHERE provider IS NOT NULL AND provider_reference IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_payments_provider_reference');
        DB::statement('DROP INDEX IF EXISTS idx_payments_source_stage');
        DB::statement(<<<'SQL'
ALTER TABLE payments
    DROP COLUMN IF EXISTS refunded_amount_egp,
    DROP COLUMN IF EXISTS transaction_reference,
    DROP COLUMN IF EXISTS provider_reference,
    DROP COLUMN IF EXISTS provider,
    DROP COLUMN IF EXISTS payment_stage,
    DROP COLUMN IF EXISTS source
SQL);
    }
};
