<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
CREATE TABLE IF NOT EXISTS payment_attempts (
    id BIGSERIAL PRIMARY KEY,
    attempt_reference VARCHAR(80) UNIQUE NOT NULL,
    idempotency_key VARCHAR(120) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    contract_id BIGINT NULL REFERENCES contracts(id) ON DELETE SET NULL,
    service_request_id BIGINT NULL REFERENCES service_requests(id) ON DELETE SET NULL,
    provider VARCHAR(30) NOT NULL,
    amount_egp DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EGP',
    status VARCHAR(40) NOT NULL DEFAULT 'created',
    checkout_url TEXT NULL,
    provider_intention_id VARCHAR(255) NULL,
    provider_order_id VARCHAR(255) NULL,
    provider_transaction_id VARCHAR(255) NULL,
    payment_id BIGINT NULL REFERENCES payments(id) ON DELETE SET NULL,
    request_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    webhook_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    verified_at TIMESTAMPTZ NULL,
    settled_at TIMESTAMPTZ NULL,
    failed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_payment_attempt_target CHECK (
        (contract_id IS NOT NULL AND service_request_id IS NULL)
        OR (contract_id IS NULL AND service_request_id IS NOT NULL)
    ),
    CONSTRAINT chk_payment_attempt_status CHECK (status IN ('created','pending','paid','failed','cancelled','expired')),
    CONSTRAINT chk_payment_attempt_provider CHECK (provider IN ('paymob','kashier'))
)
SQL);
        DB::statement('CREATE INDEX IF NOT EXISTS idx_payment_attempts_user_status ON payment_attempts(user_id,status,created_at DESC)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_payment_attempts_provider_order ON payment_attempts(provider,provider_order_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_payment_attempts_provider_tx ON payment_attempts(provider,provider_transaction_id)');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_attempts_provider_intention ON payment_attempts(provider,provider_intention_id) WHERE provider_intention_id IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_payment_attempts_provider_intention');
        DB::statement('DROP INDEX IF EXISTS idx_payment_attempts_provider_tx');
        DB::statement('DROP INDEX IF EXISTS idx_payment_attempts_provider_order');
        DB::statement('DROP INDEX IF EXISTS idx_payment_attempts_user_status');
        DB::statement('DROP TABLE IF EXISTS payment_attempts');
    }
};
