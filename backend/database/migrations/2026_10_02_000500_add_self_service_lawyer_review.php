<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS lawyer_review_add_on_selected BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS lawyer_review_add_on_price_egp DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lawyer_review_add_on_status VARCHAR(40),
    ADD COLUMN IF NOT EXISTS lawyer_review_add_on_note TEXT,
    ADD COLUMN IF NOT EXISTS lawyer_review_service_request_id BIGINT REFERENCES service_requests(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS lawyer_review_selected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS lawyer_review_completed_at TIMESTAMPTZ
SQL);
        DB::statement('CREATE INDEX IF NOT EXISTS idx_contracts_lawyer_review_status ON contracts(lawyer_review_add_on_status,updated_at DESC) WHERE lawyer_review_add_on_selected=TRUE');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_lawyer_review_request ON contracts(lawyer_review_service_request_id) WHERE lawyer_review_service_request_id IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_contract_lawyer_review_request');
        DB::statement('DROP INDEX IF EXISTS idx_contracts_lawyer_review_status');
        DB::statement(<<<'SQL'
ALTER TABLE contracts
    DROP COLUMN IF EXISTS lawyer_review_completed_at,
    DROP COLUMN IF EXISTS lawyer_review_selected_at,
    DROP COLUMN IF EXISTS lawyer_review_service_request_id,
    DROP COLUMN IF EXISTS lawyer_review_add_on_note,
    DROP COLUMN IF EXISTS lawyer_review_add_on_status,
    DROP COLUMN IF EXISTS lawyer_review_add_on_price_egp,
    DROP COLUMN IF EXISTS lawyer_review_add_on_selected
SQL);
    }
};
