const User = require('../models/user');
const Trip = require('../models/trip');
const StripeService = require('./stripe');

const providers = {
  amadeus: require('../providers/amadeus'),
  flixbus: require('../providers/flixbus'),
  rail: require('../providers/rail'),
};

async function book({ userId, trip, passengers, paymentMethodId, idempotencyKey }) {
  // 1. Validate provider before any money moves
  const provider = providers[trip.provider];
  if (!provider || !provider.book) {
    throw Object.assign(new Error(`Unknown provider: ${trip.provider}`), { status: 400 });
  }

  // 2. Get user
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  // 3. Get or create Stripe customer
  const stripeCustomerId = await StripeService.getOrCreateCustomer(
    userId,
    user.email,
    user.stripe_customer_id
  );
  if (stripeCustomerId !== user.stripe_customer_id) {
    await User.setStripeCustomerId(userId, stripeCustomerId);
  }

  // 4. Authorize payment (manual capture — nothing is taken yet)
  const intent = await StripeService.authorize({
    customerId: stripeCustomerId,
    paymentMethodId,
    amountEur: trip.priceEur,
    description: `TraveScout: ${trip.origin} → ${trip.destination} via ${trip.provider}`,
    idempotencyKey,
  });
  if (intent.status === 'requires_action') {
    throw Object.assign(
      new Error('Payment requires additional authentication'),
      { status: 402 }
    );
  }
  if (intent.status !== 'requires_capture') {
    throw Object.assign(
      new Error(`Payment failed: ${intent.status}`),
      { status: 402 }
    );
  }

  // 5. Book with provider; release the authorization if it fails
  let booking;
  try {
    booking = await provider.book({ trip, passengers });
  } catch (e) {
    await StripeService.cancel(intent.id).catch(err =>
      console.error('[booking] failed to cancel payment intent', intent.id, err)
    );
    throw Object.assign(
      new Error('Provider booking failed — payment was not captured'),
      { status: 502, cause: e }
    );
  }

  // 6. Capture the payment now that the ticket exists
  await StripeService.capture(intent.id);

  // 7. Save trip to DB
  const savedTrip = await Trip.create({
    userId,
    provider: trip.provider,
    bookingRef: booking.bookingRef,
    origin: trip.origin,
    destination: trip.destination,
    departAt: trip.departAt,
    arriveAt: trip.arriveAt || null,
    returnAt: trip.returnAt || null,
    priceEur: trip.priceEur,
    currencyDisplay: 'EUR',
    status: booking.status,
    rawTicketUrl: booking.ticketUrl || null,
  });

  return {
    bookingRef: booking.bookingRef,
    status: booking.status,
    trip: savedTrip,
  };
}

module.exports = { book };
