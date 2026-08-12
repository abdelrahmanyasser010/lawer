<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS hash_version SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS touched_field_keys_json JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE contract_versions
  ADD COLUMN IF NOT EXISTS touched_field_keys_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;

UPDATE contract_versions cv
SET issued_at = c.issued_at
FROM contracts c
WHERE c.current_version_id = cv.id
  AND c.issued_at IS NOT NULL
  AND cv.issued_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contract_versions_issued_at
  ON contract_versions(issued_at) WHERE issued_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS consultation_schedule_windows (
  id BIGSERIAL PRIMARY KEY,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_minutes INT NOT NULL DEFAULT 60 CHECK (slot_minutes BETWEEN 15 AND 240),
  total_capacity INT NOT NULL DEFAULT 10 CHECK (total_capacity BETWEEN 1 AND 500),
  zoom_capacity INT NOT NULL DEFAULT 5 CHECK (zoom_capacity BETWEEN 0 AND 500),
  whatsapp_capacity INT NOT NULL DEFAULT 5 CHECK (whatsapp_capacity BETWEEN 0 AND 500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_time > start_time),
  CHECK (zoom_capacity <= total_capacity),
  CHECK (whatsapp_capacity <= total_capacity),
  CHECK (zoom_capacity + whatsapp_capacity <= total_capacity)
);
CREATE INDEX IF NOT EXISTS idx_consultation_schedule_weekday ON consultation_schedule_windows(weekday,is_active,start_time);

CREATE TABLE IF NOT EXISTS consultation_schedule_exceptions (
  id BIGSERIAL PRIMARY KEY,
  exception_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_closed BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((start_time IS NULL AND end_time IS NULL) OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time))
);
CREATE INDEX IF NOT EXISTS idx_consultation_schedule_exceptions_date ON consultation_schedule_exceptions(exception_date);

CREATE TABLE IF NOT EXISTS consultation_bookings (
  id BIGSERIAL PRIMARY KEY,
  service_request_id BIGINT UNIQUE NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  communication_channel VARCHAR(20) NOT NULL CHECK (communication_channel IN ('zoom','whatsapp')),
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_payment',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (slot_end > slot_start)
);
CREATE INDEX IF NOT EXISTS idx_consultation_bookings_slot ON consultation_bookings(slot_start,communication_channel,status);

-- Seed a backwards-compatible default weekly schedule only when no schedule exists.
-- The office can replace it entirely from the dashboard.
INSERT INTO consultation_schedule_windows(weekday,start_time,end_time,slot_minutes,total_capacity,zoom_capacity,whatsapp_capacity)
SELECT d,'09:00','20:00',60,10,5,5
FROM generate_series(0,6) AS d
WHERE NOT EXISTS (SELECT 1 FROM consultation_schedule_windows);
SQL);
    }

    public function down(): void
    {
        throw new RuntimeException('Workflow hardening migration rollback is intentionally disabled. Restore from a verified backup instead.');
    }
};
