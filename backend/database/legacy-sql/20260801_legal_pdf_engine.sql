-- Z draft legal source + Arabic PDF engine
-- Run after 20260801_user_portal_workflow.sql.

CREATE TABLE IF NOT EXISTS contract_document_files (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  contract_version_id BIGINT NOT NULL REFERENCES contract_versions(id) ON DELETE CASCADE,
  file_key VARCHAR(180) NOT NULL,
  document_type VARCHAR(20) NOT NULL, -- main, annex
  optional_clause_key VARCHAR(120),
  title_ar VARCHAR(255) NOT NULL,
  storage_path VARCHAR(700) NOT NULL,
  sha256 VARCHAR(64) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(contract_version_id,file_key)
);

CREATE INDEX IF NOT EXISTS idx_contract_document_files_contract
  ON contract_document_files(contract_id,contract_version_id,document_type);
