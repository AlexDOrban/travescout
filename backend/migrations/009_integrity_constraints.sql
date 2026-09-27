-- A paid itinerary must always have an owner.
ALTER TABLE itineraries ALTER COLUMN user_id SET NOT NULL;

-- Booking references must be unique so they can serve as lookup / check-in ids.
-- (Partial index on trips: failed legs legitimately have NULL refs.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_booking_ref
  ON trips(booking_ref) WHERE booking_ref IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_itineraries_booking_ref
  ON itineraries(booking_ref);
