<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users ADD COLUMN IF NOT EXISTS reusable_data_json JSONB NOT NULL DEFAULT '{}'::jsonb");
        DB::statement("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_reuse_preferences_json JSONB NOT NULL DEFAULT '{}'::jsonb");

        DB::statement(<<<'SQL'
CREATE TABLE IF NOT EXISTS saved_parties (
    id BIGSERIAL PRIMARY KEY,
    owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(200) NOT NULL,
    party_kind VARCHAR(30) NOT NULL,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_contract_id BIGINT REFERENCES contracts(id) ON DELETE SET NULL,
    source_step_key VARCHAR(140),
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_saved_parties_kind CHECK (party_kind IN ('individual', 'organization')),
    CONSTRAINT uq_saved_parties_contract_step UNIQUE (owner_user_id, source_contract_id, source_step_key)
)
SQL);

        DB::statement('CREATE INDEX IF NOT EXISTS idx_saved_parties_owner ON saved_parties(owner_user_id, last_used_at DESC, id DESC)');
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS saved_parties');
        DB::statement('ALTER TABLE contracts DROP COLUMN IF EXISTS party_reuse_preferences_json');
        DB::statement('ALTER TABLE users DROP COLUMN IF EXISTS reusable_data_json');
    }
};
