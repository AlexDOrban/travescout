CREATE TABLE IF NOT EXISTS trips (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,
  booking_ref      TEXT NOT NULL,
  origin           TEXT NOT NULL,
  destination      TEXT NOT NULL,
  depart_at        TIMESTAMPTZ NOT NULL,
  return_at        TIMESTAMPTZ,
  price_eur        NUMERIC(10,2) NOT NULL,
  currency_display TEXT NOT NULL DEFAULT 'EUR',
  status           TEXT NOT NULL DEFAULT 'confirmed',
  raw_ticket_url   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trips_user_id_idx ON trips(user_id);
