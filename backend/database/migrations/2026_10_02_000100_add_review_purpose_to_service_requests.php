<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS request_purpose VARCHAR(20),
    ADD COLUMN IF NOT EXISTS contract_type_text VARCHAR(255)
SQL);

        // Standalone consultation was removed previously. Historical combined
        // service rows therefore receive the safest legacy purpose fallback.
        DB::statement(<<<'SQL'
UPDATE service_requests
SET request_purpose = 'review',
    updated_at = CURRENT_TIMESTAMP
WHERE request_type = 'contract_review'
  AND request_purpose IS NULL
SQL);

        DB::statement('ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS chk_service_requests_request_purpose');
        DB::statement(<<<'SQL'
ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_request_purpose
    CHECK (request_purpose IS NULL OR request_purpose IN ('review', 'consultation'))
SQL);

        DB::statement(<<<'SQL'
CREATE INDEX IF NOT EXISTS idx_service_requests_purpose_queue
    ON service_requests(request_type, request_purpose, status)
SQL);
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_service_requests_purpose_queue');
        DB::statement('ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS chk_service_requests_request_purpose');
        DB::statement(<<<'SQL'
ALTER TABLE service_requests
    DROP COLUMN IF EXISTS contract_type_text,
    DROP COLUMN IF EXISTS request_purpose
SQL);
    }
};
