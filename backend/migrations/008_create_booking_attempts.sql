-- Server-side idempotency ledger for bookings: one row per idempotency key,
-- storing the stored response so retries replay instead of re-charging.
CREATE TABLE IF NOT EXISTS booking_attempts (
  idempotency_key TEXT PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending',
  response        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_attempts_user_id ON booking_attempts(user_id);
