const User = require('../models/user');
const Trip = require('../models/trip');
const Itinerary = require('../models/itinerary');
const StripeService = require('./stripe');
const providers = require('../providers');

async function bookItinerary({ userId, legs, passengers, paymentMethodId, origin, destination }) {
  // 1. Get user
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  // 2. Calculate total price
  const totalPriceEur = legs.reduce((sum, leg) => sum + leg.priceEur, 0);

  // 3. Stripe charge (matches existing booking.js pattern)
  const stripeCustomerId = await StripeService.getOrCreateCustomer(
    userId,
    user.email,
    user.stripe_customer_id
  );
  const intent = await StripeService.charge({
    customerId: stripeCustomerId,
    paymentMethodId,
    amountEur: totalPriceEur,
    description: `TraveScout Itinerary: ${origin} → ${destination} (${legs.length} legs)`,
  });
  if (intent.status !== 'succeeded') {
    throw Object.assign(new Error('Payment failed'), { status: 402 });
  }

  // 4. Generate itinerary booking ref
  const bookingRef = `TS-${Date.now()}`;

  // 5. Book each leg with its provider in parallel
  const bookingResults = await Promise.allSettled(
    legs.map(leg => {
      const provider = providers.getProvider(leg.provider);
      return provider.book({ trip: leg, passengers });
    })
  );

  // 6. Determine overall status
  const failedLegs = [];
  bookingResults.forEach((result, i) => {
    if (result.status === 'rejected') {
      failedLegs.push({ legOrder: i, error: result.reason?.message || 'Booking failed' });
    }
  });
  const status = failedLegs.length > 0 ? 'partially_failed' : 'confirmed';

  // 7. Create itinerary row
  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];
  const itinerary = await Itinerary.create({
    userId,
    bookingRef,
    origin,
    destination,
    departAt: firstLeg.departAt,
    arriveAt: lastLeg.arriveAt,
    totalPriceEur,
    status,
  });

  // 8. Create trip rows for each leg
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

  return {
    bookingRef,
    status,
    itinerary: {
      id: itinerary.id,
      bookingRef: itinerary.booking_ref,
      origin: itinerary.origin,
      destination: itinerary.destination,
      departAt: itinerary.depart_at,
      arriveAt: itinerary.arrive_at,
      totalPriceEur: itinerary.total_price_eur,
      status: itinerary.status,
      legs: savedLegs,
    },
    ...(failedLegs.length > 0 ? { failedLegs } : {}),
  };
}

module.exports = { bookItinerary };
