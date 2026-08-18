-- Z draft (منصة Z draft للعقود والاستشارات الذكية)
-- Complete Execution Blueprint SQL Schema v1.1
-- Database: PostgreSQL 16+

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    pubg_id VARCHAR(10) UNIQUE NOT NULL, -- PUBG-like unique ID e.g. '58291047'
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NULL,
    password VARCHAR(255) NULL, -- Null if OAuth
    role VARCHAR(30) DEFAULT 'user', -- user, lawyer, admin, super_admin
    email_verified_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_pubg_id ON users(pubg_id);

CREATE TABLE IF NOT EXISTS contract_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL, -- rental, apartment_sale, freelancer
    description TEXT,
    price_egp DECIMAL(10,2) NOT NULL DEFAULT 59.00,
    icon VARCHAR(50) DEFAULT 'file-text',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contract_sections (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    title_ar VARCHAR(150) NOT NULL,
    display_order INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS contract_fields (
    id BIGSERIAL PRIMARY KEY,
    section_id BIGINT NOT NULL REFERENCES contract_sections(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    label VARCHAR(150) NOT NULL,
    placeholder VARCHAR(255),
    field_type VARCHAR(30) NOT NULL, -- text, textarea, number, select, boolean, date
    is_required BOOLEAN DEFAULT TRUE,
    validation_rule VARCHAR(255) NOT NULL,
    help_description TEXT,
    options_json JSONB NULL, -- For select fields
    is_core_identity_field BOOLEAN DEFAULT FALSE -- True if locked after creation
);

CREATE TABLE IF NOT EXISTS contracts (
    id BIGSERIAL PRIMARY KEY,
    serial_number VARCHAR(32) UNIQUE NOT NULL, -- SCP-2026-RNT-000001
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id BIGINT NOT NULL REFERENCES contract_templates(id) ON DELETE RESTRICT,
    creation_mode VARCHAR(30) NOT NULL DEFAULT 'self_service', -- self_service, lawyer_assisted
    status VARCHAR(50) DEFAULT 'draft', -- draft, pending_payment_verification, pending_lawyer_drafting, paid, issued
    core_identity_locked BOOLEAN DEFAULT FALSE,
    pdf_path VARCHAR(512) NULL,
    qr_code_path VARCHAR(512) NULL,
    edit_expires_at TIMESTAMP WITH TIME ZONE NULL, -- 24 hour edit window
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contract_field_values (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    field_id BIGINT NOT NULL REFERENCES contract_fields(id) ON DELETE CASCADE,
    value TEXT NULL,
    UNIQUE(contract_id, field_id)
);

CREATE TABLE IF NOT EXISTS legal_consultations (
    id BIGSERIAL PRIMARY KEY,
    serial_number VARCHAR(32) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_lawyer_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    case_description TEXT NOT NULL,
    consultation_fee_egp DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_payment_verification', -- pending_payment_verification, pending_lawyer_review, answered, closed
    review_sla_hours INT DEFAULT 24,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_attachments (
    id BIGSERIAL PRIMARY KEY,
    attachable_type VARCHAR(100) NOT NULL, -- Contract or LegalConsultation
    attachable_id BIGINT NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    is_compressed BOOLEAN DEFAULT TRUE,
    original_file_name VARCHAR(255),
    source_file_type VARCHAR(100),
    source_file_size_bytes BIGINT,
    source_content_hash VARCHAR(64),
    image_width INT,
    image_height INT,
    metadata_stripped BOOLEAN NOT NULL DEFAULT FALSE,
    processing_version VARCHAR(40),
    processed_at TIMESTAMP WITH TIME ZONE,
    thumbnail_file_path VARCHAR(700),
    thumbnail_storage_key VARCHAR(700),
    thumbnail_file_type VARCHAR(100),
    thumbnail_file_size_bytes BIGINT,
    thumbnail_content_hash VARCHAR(64),
    original_file_path VARCHAR(700),
    original_storage_key VARCHAR(700),
    original_storage_driver VARCHAR(20),
    display_order INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attachments_attachable ON document_attachments(attachable_type, attachable_id);

CREATE TABLE IF NOT EXISTS shared_collaborations (
    id BIGSERIAL PRIMARY KEY,
    shareable_type VARCHAR(100) NOT NULL, -- Contract or LegalConsultation
    shareable_id BIGINT NOT NULL,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(30) NOT NULL DEFAULT 'view_download', -- view_download, edit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shareable_type, shareable_id, target_user_id)
);

CREATE TABLE IF NOT EXISTS vodafone_cash_payments (
    id BIGSERIAL PRIMARY KEY,
    payable_type VARCHAR(100) NOT NULL, -- Contract or LegalConsultation
    payable_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    serial_number VARCHAR(32) UNIQUE NOT NULL,
    amount_egp DECIMAL(10,2) NOT NULL,
    sender_phone VARCHAR(20) NULL,
    receipt_image_path VARCHAR(512) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending_verification', -- pending_verification, approved, rejected
    admin_notes TEXT NULL,
    reviewed_by_admin_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IF NOT EXISTS idx_vodafone_cash_status ON vodafone_cash_payments(status);

-- ---------------------------------------------------------------------------
-- Template Engine v2 (Parent Template -> Variants -> Steps -> Fields -> Clauses)
-- This section keeps the current normalized schema while preparing the real API.
-- ---------------------------------------------------------------------------

ALTER TABLE contract_templates
    ADD COLUMN IF NOT EXISTS template_version INT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS contract_template_variants (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
    variant_key VARCHAR(100) NOT NULL,
    name_ar VARCHAR(180) NOT NULL,
    document_title_ar VARCHAR(220) NULL,
    source_document_name VARCHAR(255) NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, variant_key)
);

ALTER TABLE contract_template_variants
    ADD COLUMN IF NOT EXISTS document_title_ar VARCHAR(220) NULL,
    ADD COLUMN IF NOT EXISTS source_document_name VARCHAR(255) NULL;

CREATE TABLE IF NOT EXISTS contract_variant_steps (
    id BIGSERIAL PRIMARY KEY,
    variant_id BIGINT NOT NULL REFERENCES contract_template_variants(id) ON DELETE CASCADE,
    step_key VARCHAR(120) NOT NULL,
    title_ar VARCHAR(180) NOT NULL,
    article_range VARCHAR(180) NULL,
    description TEXT NULL,
    display_order INT NOT NULL DEFAULT 1,
    visible_when_json JSONB NULL,
    UNIQUE(variant_id, step_key)
);

CREATE TABLE IF NOT EXISTS contract_variant_fields (
    id BIGSERIAL PRIMARY KEY,
    step_id BIGINT NOT NULL REFERENCES contract_variant_steps(id) ON DELETE CASCADE,
    field_key VARCHAR(140) NOT NULL,
    field_type VARCHAR(40) NOT NULL,
    label_ar VARCHAR(200) NOT NULL,
    placeholder VARCHAR(255) NULL,
    help_text TEXT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    validation_json JSONB NULL,
    options_json JSONB NULL,
    repeater_columns_json JSONB NULL,
    visible_when_json JSONB NULL,
    display_order INT NOT NULL DEFAULT 1,
    UNIQUE(step_id, field_key)
);

CREATE TABLE IF NOT EXISTS legal_clause_library (
    id BIGSERIAL PRIMARY KEY,
    clause_key VARCHAR(140) UNIQUE NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    clause_text_ar TEXT NOT NULL,
    clause_version INT NOT NULL DEFAULT 1,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contract_variant_required_clauses (
    variant_id BIGINT NOT NULL REFERENCES contract_template_variants(id) ON DELETE CASCADE,
    clause_id BIGINT NOT NULL REFERENCES legal_clause_library(id) ON DELETE RESTRICT,
    display_order INT NOT NULL DEFAULT 1,
    PRIMARY KEY (variant_id, clause_id)
);

CREATE TABLE IF NOT EXISTS contract_variant_optional_clauses (
    variant_id BIGINT NOT NULL REFERENCES contract_template_variants(id) ON DELETE CASCADE,
    clause_id BIGINT NOT NULL REFERENCES legal_clause_library(id) ON DELETE RESTRICT,
    insert_before_step_key VARCHAR(120) NOT NULL,
    document_title_ar VARCHAR(220) NULL,
    source_document_name VARCHAR(255) NULL,
    output_mode VARCHAR(30) NOT NULL DEFAULT 'inline',
    configuration_json JSONB NULL,
    display_order INT NOT NULL DEFAULT 1,
    PRIMARY KEY (variant_id, clause_id)
);

ALTER TABLE contract_variant_optional_clauses
    ADD COLUMN IF NOT EXISTS document_title_ar VARCHAR(220) NULL,
    ADD COLUMN IF NOT EXISTS source_document_name VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS output_mode VARCHAR(30) NOT NULL DEFAULT 'inline';

ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS template_version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS variant_key VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS selected_optional_clause_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS field_values_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS attachment_refs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS current_step_key VARCHAR(120) NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_template_variant
    ON contracts(template_id, variant_key);
