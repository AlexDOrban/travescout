const KNOWN_PROVIDERS = ['amadeus', 'flixbus', 'rail'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateItineraryBookingBody(body) {
  const { legs, passengers, paymentMethodId, origin, destination } = body;

  if (!Array.isArray(legs) || legs.length === 0 || legs.length > 3) {
    throw Object.assign(new Error('legs must be an array of 1-3 items'), { status: 400 });
  }

  legs.forEach((leg, i) => {
    if (!leg.id || !leg.provider || !leg.origin || !leg.destination) {
      throw Object.assign(new Error(`leg ${i} missing required fields`), { status: 400 });
    }
    if (!KNOWN_PROVIDERS.includes(leg.provider)) {
      throw Object.assign(new Error(`leg ${i} has unknown provider: ${leg.provider}`), { status: 400 });
    }
    if (typeof leg.priceEur !== 'number' || !Number.isFinite(leg.priceEur) || leg.priceEur <= 0) {
      throw Object.assign(new Error(`leg ${i} priceEur must be a positive number`), { status: 400 });
    }
  });

  if (!Array.isArray(passengers) || passengers.length === 0) {
    throw Object.assign(new Error('passengers must be a non-empty array'), { status: 400 });
  }

  passengers.forEach((p, i) => {
    if (!p.name || !p.email) {
      throw Object.assign(new Error(`passenger ${i} missing name or email`), { status: 400 });
    }
    if (typeof p.email !== 'string' || !EMAIL_RE.test(p.email)) {
      throw Object.assign(new Error(`passenger ${i} email is invalid`), { status: 400 });
    }
  });

  if (!paymentMethodId || typeof paymentMethodId !== 'string') {
    throw Object.assign(new Error('paymentMethodId is required'), { status: 400 });
  }

  if (!origin || !destination) {
    throw Object.assign(new Error('origin and destination are required'), { status: 400 });
  }

  return { legs, passengers, paymentMethodId, origin, destination };
}

module.exports = { validateItineraryBookingBody };
