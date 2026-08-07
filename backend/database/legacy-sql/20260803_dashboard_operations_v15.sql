-- Z draft dashboard/backend operations completion v15.
-- Adds reporting indexes and safe public settings without changing prior data.

CREATE INDEX IF NOT EXISTS idx_payments_reporting
  ON payments(reviewed_at,status) INCLUDE (amount_egp,user_id);

CREATE INDEX IF NOT EXISTS idx_contracts_reporting
  ON contracts(created_at,status,source_channel) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_issued_reporting
  ON contracts(issued_at) WHERE deleted_at IS NULL AND issued_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_requests_reporting
  ON service_requests(created_at,status,request_type,assigned_lawyer_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_completed_reporting
  ON service_requests(completed_at) WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_customer_created
  ON users(created_at,status);

INSERT INTO platform_settings(setting_key,setting_value_json,is_secret)
VALUES
  ('office.support_email','""'::jsonb,FALSE)
ON CONFLICT (setting_key) DO NOTHING;
