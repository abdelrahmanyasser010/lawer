-- Z draft customer portal workflow foundation
-- Run after 20260801_backend_foundation.sql.

-- Self-service contracts: core data locks after payment, while permitted fields
-- remain editable for a configurable 24-hour window before automatic finalization.
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS edit_window_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalization_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pdf_status VARCHAR(24) NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS pdf_error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_contracts_self_service_expiry
  ON contracts(edit_expires_at)
  WHERE creation_mode='self_service' AND status='client_review' AND edit_expires_at IS NOT NULL;

-- Explicit customer-service communication. There is intentionally no chat
-- feature; contact happens by office meeting, Zoom, or WhatsApp.
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS communication_channel VARCHAR(20),
  ADD COLUMN IF NOT EXISTS preferred_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meeting_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meeting_location TEXT,
  ADD COLUMN IF NOT EXISTS linked_contract_id BIGINT REFERENCES contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_confirmed_at TIMESTAMPTZ;

ALTER TABLE service_request_events
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'internal';

CREATE INDEX IF NOT EXISTS idx_service_request_events_client
  ON service_request_events(service_request_id,created_at)
  WHERE visibility='client';

-- Files delivered by the office to the customer. The source contract uploaded
-- by the customer remains an attachment; every reviewed/final file is a
-- separate deliverable and is never overwritten.
CREATE TABLE IF NOT EXISTS service_request_deliverables (
  id BIGSERIAL PRIMARY KEY,
  service_request_id BIGINT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  attachment_id BIGINT NOT NULL REFERENCES document_attachments(id) ON DELETE RESTRICT,
  deliverable_type VARCHAR(30) NOT NULL, -- review_report, revised_document, final_document, supporting_document
  version_number INT NOT NULL DEFAULT 1,
  title VARCHAR(255) NOT NULL,
  notes TEXT,
  is_final BOOLEAN NOT NULL DEFAULT FALSE,
  published_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(service_request_id, deliverable_type, version_number)
);

CREATE INDEX IF NOT EXISTS idx_service_request_deliverables
  ON service_request_deliverables(service_request_id,published_at DESC);

INSERT INTO platform_settings(setting_key,setting_value_json,is_secret)
VALUES
  ('contracts.self_service_edit_hours','24'::jsonb,FALSE),
  ('customer_portal.communication_channels','["office","zoom","whatsapp"]'::jsonb,FALSE),
  ('customer_portal.chat_enabled','false'::jsonb,FALSE)
ON CONFLICT (setting_key) DO NOTHING;

-- Public customer portal configuration. Values remain editable from the
-- dashboard settings API and are exposed only through a safe public catalog.
INSERT INTO platform_settings(setting_key,setting_value_json,is_secret)
VALUES
  ('services.contract_review.deposit_egp','100'::jsonb,FALSE),
  ('services.consultation.deposit_egp','100'::jsonb,FALSE),
  ('services.contract_drafting.deposit_egp','100'::jsonb,FALSE),
  ('office.address','""'::jsonb,FALSE),
  ('office.whatsapp_number','""'::jsonb,FALSE),
  ('payments.vodafone_cash_number','""'::jsonb,FALSE)
ON CONFLICT (setting_key) DO NOTHING;
