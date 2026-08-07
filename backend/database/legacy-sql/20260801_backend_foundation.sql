-- Z draft backend foundation v2
-- Run after database/schema.sql and 20260731_dashboard_production.sql.

-- ---------------------------------------------------------------------------
-- Users, authentication and sessions
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS public_id VARCHAR(32),
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(180),
  ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS whatsapp_service_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

UPDATE users SET public_id = COALESCE(public_id, 'USR-' || upper(substr(md5(id::text || email),1,12)));
-- Legacy plaintext/mock passwords are intentionally not copied into password_hash.
-- Existing accounts must use the reset-password flow or be reseeded.
ALTER TABLE users ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_public_id ON users(public_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active ON auth_sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- Dynamic template versions. definition_json is the canonical editor payload.
-- Published versions are immutable at application level.
-- ---------------------------------------------------------------------------
ALTER TABLE contract_templates
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS current_published_version_id BIGINT;

CREATE TABLE IF NOT EXISTS template_versions (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, legal_review, published, archived
  definition_json JSONB NOT NULL,
  change_summary TEXT,
  legal_reference TEXT,
  effective_from TIMESTAMPTZ,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMPTZ,
  UNIQUE(template_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_template_versions_status ON template_versions(template_id,status,version_number DESC);

-- ---------------------------------------------------------------------------
-- Contracts and immutable versions
-- ---------------------------------------------------------------------------
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS client_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_lawyer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_version_id BIGINT REFERENCES template_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS current_version_id BIGINT,
  ADD COLUMN IF NOT EXISTS source_channel VARCHAR(20) NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS billing_mode VARCHAR(30) NOT NULL DEFAULT 'client_invoice',
  ADD COLUMN IF NOT EXISTS original_price_egp DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waiver_reason TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_contracts_client_status ON contracts(client_user_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_lawyer_status ON contracts(assigned_lawyer_id,status,updated_at DESC);

ALTER TABLE contract_versions
  ADD COLUMN IF NOT EXISTS template_version_id BIGINT REFERENCES template_versions(id) ON DELETE RESTRICT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='fk_contracts_current_version'
  ) THEN
    ALTER TABLE contracts ADD CONSTRAINT fk_contracts_current_version
      FOREIGN KEY (current_version_id) REFERENCES contract_versions(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS document_jobs (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  contract_version_id BIGINT NOT NULL REFERENCES contract_versions(id) ON DELETE CASCADE,
  job_type VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_document_jobs_pending ON document_jobs(status,available_at) WHERE status IN ('pending','retry');

-- ---------------------------------------------------------------------------
-- Service request workflow and events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_request_events (
  id BIGSERIAL PRIMARY KEY,
  service_request_id BIGINT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  notes TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_service_request_events ON service_request_events(service_request_id,created_at);

-- ---------------------------------------------------------------------------
-- Payments. Kept separate from the legacy vodafone_cash_payments table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  serial_number VARCHAR(40) UNIQUE NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  contract_id BIGINT REFERENCES contracts(id) ON DELETE SET NULL,
  service_request_id BIGINT REFERENCES service_requests(id) ON DELETE SET NULL,
  amount_egp DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(40) NOT NULL,
  sender_phone VARCHAR(30),
  receipt_attachment_id BIGINT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
  admin_notes TEXT,
  reviewed_by_admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (contract_id IS NOT NULL OR service_request_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(status,created_at DESC);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_payments_receipt_attachment') THEN
    ALTER TABLE payments ADD CONSTRAINT fk_payments_receipt_attachment
      FOREIGN KEY (receipt_attachment_id) REFERENCES document_attachments(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Private attachments
-- ---------------------------------------------------------------------------
ALTER TABLE document_attachments
  ADD COLUMN IF NOT EXISTS owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS storage_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'private';
CREATE INDEX IF NOT EXISTS idx_attachments_owner ON document_attachments(owner_user_id,created_at DESC);

-- ---------------------------------------------------------------------------
-- Notification outbox and settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_outbox (
  id BIGSERIAL PRIMARY KEY,
  channel VARCHAR(20) NOT NULL,
  recipient TEXT NOT NULL,
  template_key VARCHAR(100) NOT NULL,
  subject TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  error_message TEXT,
  available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending ON notification_outbox(status,available_at) WHERE status IN ('pending','retry');

CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value_json JSONB NOT NULL,
  is_secret BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Safe defaults. Secrets remain environment variables / secret manager values.
INSERT INTO platform_settings(setting_key,setting_value_json,is_secret)
VALUES
  ('office.display_name','"Z draft Law Office"'::jsonb,FALSE),
  ('contracts.require_email_verification','true'::jsonb,FALSE),
  ('notifications.whatsapp_mode','"manual_wa_me"'::jsonb,FALSE),
  ('notifications.web_push_enabled','false'::jsonb,FALSE)
ON CONFLICT (setting_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Time-bound contract sharing links (Z-ID / public-id gated collaboration)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contract_share_links (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  created_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  permission_level VARCHAR(20) NOT NULL DEFAULT 'view_only', -- view_only, edit
  target_public_id VARCHAR(32),
  editable_field_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_contract_share_links_active
  ON contract_share_links(contract_id,expires_at) WHERE revoked_at IS NULL;
