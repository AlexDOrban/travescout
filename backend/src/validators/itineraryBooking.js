const KNOWN_PROVIDERS = ['amadeus', 'flixbus', 'rail'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRIP_TYPES = ['one_way', 'round_trip'];
const DIRECTIONS = ['outbound', 'return'];
// 1 main leg + up to 2 feeder connections per direction.
const MAX_LEGS_PER_DIRECTION = 3;

const badRequest = message => Object.assign(new Error(message), { status: 400 });

function validateItineraryBookingBody(body) {
  const { legs, passengers, paymentMethodId, origin, destination } = body;
  const tripType = body.tripType ?? 'one_way';

  if (!TRIP_TYPES.includes(tripType)) {
    throw badRequest('tripType must be one_way or round_trip');
  }

  const maxLegs = tripType === 'round_trip' ? MAX_LEGS_PER_DIRECTION * 2 : MAX_LEGS_PER_DIRECTION;
  if (!Array.isArray(legs) || legs.length === 0 || legs.length > maxLegs) {
    throw badRequest(`legs must be an array of 1-${maxLegs} items`);
  }

  legs.forEach((leg, i) => {
    if (!leg.id || !leg.provider || !leg.origin || !leg.destination) {
      throw badRequest(`leg ${i} missing required fields`);
    }
    if (!KNOWN_PROVIDERS.includes(leg.provider)) {
      throw badRequest(`leg ${i} has unknown provider: ${leg.provider}`);
    }
    if (typeof leg.priceEur !== 'number' || !Number.isFinite(leg.priceEur) || leg.priceEur <= 0) {
      throw badRequest(`leg ${i} priceEur must be a positive number`);
    }
    if (leg.direction !== undefined && !DIRECTIONS.includes(leg.direction)) {
      throw badRequest(`leg ${i} direction must be outbound or return`);
    }
  });

  const directions = legs.map(l => l.direction ?? 'outbound');
  if (tripType === 'one_way' && directions.includes('return')) {
    throw badRequest('one-way itineraries cannot have return legs');
  }
  if (tripType === 'round_trip') {
    const firstReturn = directions.indexOf('return');
    if (firstReturn <= 0 || directions.slice(firstReturn).includes('outbound')) {
      throw badRequest('round trips need outbound legs followed by return legs');
    }
    if (firstReturn > MAX_LEGS_PER_DIRECTION || directions.length - firstReturn > MAX_LEGS_PER_DIRECTION) {
      throw badRequest(`at most ${MAX_LEGS_PER_DIRECTION} legs per direction`);
    }
  }

  if (!Array.isArray(passengers) || passengers.length === 0) {
    throw badRequest('passengers must be a non-empty array');
  }

  passengers.forEach((p, i) => {
    if (!p.name || !p.email) {
      throw badRequest(`passenger ${i} missing name or email`);
    }
    if (typeof p.email !== 'string' || !EMAIL_RE.test(p.email)) {
      throw badRequest(`passenger ${i} email is invalid`);
    }
  });

  if (!paymentMethodId || typeof paymentMethodId !== 'string') {
    throw badRequest('paymentMethodId is required');
  }

  if (!origin || !destination) {
    throw badRequest('origin and destination are required');
  }

  return {
    legs: legs.map((l, i) => ({ ...l, direction: directions[i] })),
    passengers,
    paymentMethodId,
    origin,
    destination,
    tripType,
  };
}

module.exports = { validateItineraryBookingBody };
