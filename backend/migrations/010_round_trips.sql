-- Round trips: an itinerary is one-way or a round trip, and each leg belongs
-- to the outbound or the return direction. Existing rows are one-way/outbound.
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS trip_type TEXT NOT NULL DEFAULT 'one_way';
ALTER TABLE itineraries DROP CONSTRAINT IF EXISTS itineraries_trip_type_check;
ALTER TABLE itineraries ADD CONSTRAINT itineraries_trip_type_check
  CHECK (trip_type IN ('one_way', 'round_trip'));

ALTER TABLE trips ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound';
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_direction_check;
ALTER TABLE trips ADD CONSTRAINT trips_direction_check
  CHECK (direction IN ('outbound', 'return'));
