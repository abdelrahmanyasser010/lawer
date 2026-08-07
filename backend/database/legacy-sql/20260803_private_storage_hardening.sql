-- Z draft private file storage hardening.
-- Keeps the current local VPS adapter while storing canonical keys so another
-- adapter can be introduced later without changing contract/payment domains.

ALTER TABLE document_attachments
  ADD COLUMN IF NOT EXISTS storage_driver VARCHAR(20) NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS scan_status VARCHAR(24) NOT NULL DEFAULT 'legacy_unscanned',
  ADD COLUMN IF NOT EXISTS scan_engine VARCHAR(40),
  ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;

UPDATE document_attachments
SET storage_driver='local'
WHERE storage_driver IS NULL OR storage_driver='';

CREATE INDEX IF NOT EXISTS idx_document_attachments_pending_cleanup
  ON document_attachments(created_at)
  WHERE attachable_type='pending';

ALTER TABLE contract_document_files
  ADD COLUMN IF NOT EXISTS storage_driver VARCHAR(20) NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS storage_key VARCHAR(700);

UPDATE contract_document_files
SET storage_driver='local'
WHERE storage_driver IS NULL OR storage_driver='';

INSERT INTO platform_settings(setting_key,setting_value_json,is_secret)
VALUES
  ('storage.primary_driver','"local"'::jsonb,FALSE),
  ('storage.contract_retention','"indefinite"'::jsonb,FALSE),
  ('storage.pending_attachment_ttl_hours','24'::jsonb,FALSE),
  ('storage.offsite_backup_required','true'::jsonb,FALSE)
ON CONFLICT (setting_key) DO NOTHING;
