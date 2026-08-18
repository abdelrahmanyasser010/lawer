-- Z draft dashboard production workflow blueprint
-- PostgreSQL 16+

-- Staff accounts remain users, but office access and lifecycle are explicit.
CREATE TABLE IF NOT EXISTS staff_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
    staff_status VARCHAR(30) NOT NULL DEFAULT 'invited', -- invited, active, suspended
    job_title VARCHAR(120) NULL,
    invited_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE NULL,
    activated_at TIMESTAMP WITH TIME ZONE NULL,
    last_login_at TIMESTAMP WITH TIME ZONE NULL,
    password_change_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    role_key VARCHAR(60) UNIQUE NOT NULL,
    name_ar VARCHAR(120) NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY,
    permission_key VARCHAR(100) UNIQUE NOT NULL,
    name_ar VARCHAR(180) NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS staff_role_assignments (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    assigned_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- Unified queue for lawyer drafting, external document review and consultations.
CREATE TABLE IF NOT EXISTS service_requests (
    id BIGSERIAL PRIMARY KEY,
    serial_number VARCHAR(40) UNIQUE NOT NULL,
    request_type VARCHAR(30) NOT NULL, -- contract_drafting, contract_review, consultation
    source_channel VARCHAR(30) NOT NULL DEFAULT 'customer', -- customer, office
    client_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_by_staff_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    assigned_lawyer_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    due_at TIMESTAMP WITH TIME ZONE NULL,
    meeting_provider VARCHAR(30) NULL,
    meeting_url TEXT NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_requests_queue
    ON service_requests(request_type, status, assigned_lawyer_id, due_at);

-- Metadata for contracts created by the office without impersonating a client.
CREATE TABLE IF NOT EXISTS contract_office_contexts (
    contract_id BIGINT PRIMARY KEY REFERENCES contracts(id) ON DELETE CASCADE,
    created_by_staff_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_lawyer_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    client_mode VARCHAR(30) NOT NULL, -- existing, new, office_internal
    client_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    billing_mode VARCHAR(30) NOT NULL, -- office_waiver, external_collection, client_invoice
    original_price_egp DECIMAL(10,2) NOT NULL DEFAULT 0,
    waiver_reason TEXT NULL,
    notify_client BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Every legal revision is a new version; issued versions are immutable.
CREATE TABLE IF NOT EXISTS contract_versions (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    parent_version_id BIGINT NULL REFERENCES contract_versions(id) ON DELETE RESTRICT,
    template_version INT NOT NULL,
    variant_key VARCHAR(100) NULL,
    selected_optional_clause_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
    field_values_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    legal_clause_snapshot_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(40) NOT NULL DEFAULT 'draft', -- draft, internal_review, client_review, issued, superseded
    pdf_path VARCHAR(512) NULL,
    document_hash VARCHAR(128) NULL,
    created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_at TIMESTAMP WITH TIME ZONE NULL,
    UNIQUE(contract_id, version_number)
);

CREATE TABLE IF NOT EXISTS contract_review_cycles (
    id BIGSERIAL PRIMARY KEY,
    service_request_id BIGINT NULL REFERENCES service_requests(id) ON DELETE SET NULL,
    contract_id BIGINT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    contract_version_id BIGINT NOT NULL REFERENCES contract_versions(id) ON DELETE RESTRICT,
    reviewer_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'pending', -- pending, changes_requested, approved, client_review
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE TABLE IF NOT EXISTS dashboard_notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(80) NOT NULL,
    title VARCHAR(220) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dashboard_notifications_unread
    ON dashboard_notifications(recipient_user_id, read_at, created_at DESC);

-- Append-only audit. Application role must not receive UPDATE/DELETE privileges.
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(80) NOT NULL,
    actor_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_values_json JSONB NULL,
    new_values_json JSONB NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    previous_hash VARCHAR(128) NULL,
    record_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
    ON audit_logs(entity_type, entity_id, created_at DESC);
