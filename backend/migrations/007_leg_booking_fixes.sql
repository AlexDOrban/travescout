-- Failed itinerary legs have no provider booking ref.
ALTER TABLE trips ALTER COLUMN booking_ref DROP NOT NULL;

-- Per-leg arrival time (previously silently dropped on insert).
ALTER TABLE trips ADD COLUMN IF NOT EXISTS arrive_at TIMESTAMPTZ;
