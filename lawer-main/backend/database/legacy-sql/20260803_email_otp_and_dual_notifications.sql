-- Email OTP verification and dual in-app/email notifications.

ALTER TABLE email_verification_tokens
  ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) NOT NULL DEFAULT 'link';

CREATE INDEX IF NOT EXISTS idx_email_verification_active_user
  ON email_verification_tokens(user_id, created_at DESC)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending_email
  ON notification_outbox(status, available_at, id)
  WHERE channel='email' AND status IN ('pending','retry');
