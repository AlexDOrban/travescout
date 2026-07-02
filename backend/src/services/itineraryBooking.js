const crypto = require('crypto');
const User = require('../models/user');
const Trip = require('../models/trip');
const Itinerary = require('../models/itinerary');
const StripeService = require('./stripe');
const providers = require('../providers');

async function bookItinerary({ userId, legs, passengers, paymentMethodId, origin, destination, idempotencyKey }) {
  // 1. Resolve all leg providers before any money moves
  const legProviders = legs.map(leg => providers.getProvider(leg.provider));

  // 2. Get user
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  // 3. Calculate total price
  const totalPriceEur = legs.reduce((sum, leg) => sum + leg.priceEur, 0);

  // 4. Authorize payment (manual capture — nothing is taken yet)
  const stripeCustomerId = await StripeService.getOrCreateCustomer(
    userId,
    user.email,
    user.stripe_customer_id
  );
  if (stripeCustomerId !== user.stripe_customer_id) {
    await User.setStripeCustomerId(userId, stripeCustomerId);
  }
  const intent = await StripeService.authorize({
    customerId: stripeCustomerId,
    paymentMethodId,
    amountEur: totalPriceEur,
    description: `TraveScout Itinerary: ${origin} → ${destination} (${legs.length} legs)`,
    idempotencyKey,
  });
  if (intent.status !== 'requires_capture') {
    throw Object.assign(new Error('Payment failed'), { status: 402 });
  }

  // 5. Book each leg with its provider in parallel
  const bookingResults = await Promise.allSettled(
    legs.map((leg, i) => legProviders[i].book({ trip: leg, passengers }))
  );

  // 6. Determine overall status; only capture money for legs that booked
  const failedLegs = [];
  let succeededPriceEur = 0;
  bookingResults.forEach((result, i) => {
    if (result.status === 'rejected') {
      failedLegs.push({ legOrder: i, error: result.reason?.message || 'Booking failed' });
    } else {
      succeededPriceEur += legs[i].priceEur;
    }
  });

  if (succeededPriceEur === 0) {
    await StripeService.cancel(intent.id).catch(err =>
      console.error('[itinerary] failed to cancel payment intent', intent.id, err)
    );
    throw Object.assign(
      new Error('All leg bookings failed — payment was not captured'),
      { status: 502 }
    );
  }

  // Partial capture: the uncaptured remainder for failed legs is released.
  await StripeService.capture(intent.id, succeededPriceEur);

  const status = failedLegs.length > 0 ? 'partially_failed' : 'confirmed';

  // 7. Generate itinerary booking ref (unique, non-guessable)
  const bookingRef = `TS-${crypto.randomUUID().split('-')[0].toUpperCase()}`;

  // 8. Create itinerary row
  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];
  const itinerary = await Itinerary.create({
    userId,
    bookingRef,
    origin,
    destination,
    departAt: firstLeg.departAt,
    arriveAt: lastLeg.arriveAt,
    totalPriceEur: succeededPriceEur,
    status,
  });

  // 9. Create trip rows for each leg
  const savedLegs = [];
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const result = bookingResults[i];
    const succeeded = result.status === 'fulfilled';
    const providerResult = succeeded ? result.value : null;

    const trip = await Trip.create({
      userId,
      provider: leg.provider,
      bookingRef: providerResult?.bookingRef || null,
      origin: leg.origin,
      destination: leg.destination,
      departAt: leg.departAt,
      arriveAt: leg.arriveAt,
      priceEur: leg.priceEur,
      status: succeeded ? 'confirmed' : 'failed',
      rawTicketUrl: providerResult?.ticketUrl || null,
      ticketQrData: providerResult ? `TICKET:${providerResult.bookingRef}` : null,
      itineraryId: itinerary.id,
      legOrder: i,
    });
    savedLegs.push(trip);
  }

  // Same snake_case shape as GET /itineraries so the client renders both alike.
  return {
    bookingRef,
    status,
    itinerary: {
      ...itinerary,
      legs: savedLegs,
    },
    ...(failedLegs.length > 0 ? { failedLegs } : {}),
  };
}

module.exports = { bookItinerary };
