-- Server-side image normalization for every attachment upload.
-- Images are stored as metadata-free WebP files with a private WebP thumbnail.
-- The exact source bytes are optional and disabled by default; source hashes are always retained.

ALTER TABLE document_attachments
  ADD COLUMN IF NOT EXISTS original_file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS source_file_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source_file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS source_content_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS image_width INT,
  ADD COLUMN IF NOT EXISTS image_height INT,
  ADD COLUMN IF NOT EXISTS metadata_stripped BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS processing_version VARCHAR(40),
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS thumbnail_file_path VARCHAR(700),
  ADD COLUMN IF NOT EXISTS thumbnail_storage_key VARCHAR(700),
  ADD COLUMN IF NOT EXISTS thumbnail_file_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS thumbnail_file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS thumbnail_content_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS original_file_path VARCHAR(700),
  ADD COLUMN IF NOT EXISTS original_storage_key VARCHAR(700),
  ADD COLUMN IF NOT EXISTS original_storage_driver VARCHAR(20);

ALTER TABLE document_attachments
  ALTER COLUMN storage_key TYPE VARCHAR(700);

UPDATE document_attachments
SET original_file_name=COALESCE(original_file_name,file_name),
    source_file_type=COALESCE(source_file_type,file_type),
    source_file_size_bytes=COALESCE(source_file_size_bytes,file_size_bytes),
    source_content_hash=COALESCE(source_content_hash,content_hash)
WHERE original_file_name IS NULL
   OR source_file_type IS NULL
   OR source_file_size_bytes IS NULL
   OR source_content_hash IS NULL;

CREATE INDEX IF NOT EXISTS idx_document_attachments_image_processing
  ON document_attachments(processing_version,processed_at DESC)
  WHERE processing_version IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_attachments_thumbnail
  ON document_attachments(id)
  WHERE thumbnail_storage_key IS NOT NULL OR thumbnail_file_path IS NOT NULL;

INSERT INTO platform_settings(setting_key,setting_value_json,is_secret)
VALUES
  ('uploads.image_processing','{"format":"webp","max_dimension":1920,"max_output_bytes":1500000,"metadata":"stripped","thumbnail_dimension":480}'::jsonb,FALSE),
  ('uploads.original_image_retention','"disabled_by_default"'::jsonb,FALSE)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value_json=EXCLUDED.setting_value_json,
    is_secret=FALSE;
