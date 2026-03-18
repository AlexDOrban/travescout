const User = require('../models/user');
const Trip = require('../models/trip');
const StripeService = require('./stripe');

const providers = {
  amadeus: require('../providers/amadeus'),
  flixbus: require('../providers/flixbus'),
  rail: require('../providers/rail'),
};

async function book({ userId, trip, passengers, paymentMethodId }) {
  // 1. Get user
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  // 2. Get or create Stripe customer
  const stripeCustomerId = await StripeService.getOrCreateCustomer(
    userId,
    user.email,
    user.stripe_customer_id
  );
  if (stripeCustomerId !== user.stripe_customer_id) {
    await User.setStripeCustomerId(userId, stripeCustomerId);
  }

  // 3. Charge via Stripe
  const intent = await StripeService.charge({
    customerId: stripeCustomerId,
    paymentMethodId,
    amountEur: trip.priceEur,
    description: `TraveScout: ${trip.origin} → ${trip.destination} via ${trip.provider}`,
  });
  if (intent.status !== 'succeeded') {
    throw Object.assign(
      new Error(`Payment failed: ${intent.status}`),
      { status: 402 }
    );
  }

  // 4. Book with provider
  const provider = providers[trip.provider];
  if (!provider || !provider.book) {
    throw Object.assign(new Error(`Unknown provider: ${trip.provider}`), { status: 400 });
  }
  const booking = await provider.book({ trip, passengers });

  // 5. Save trip to DB
  const savedTrip = await Trip.create({
    userId,
    provider: trip.provider,
    bookingRef: booking.bookingRef,
    origin: trip.origin,
    destination: trip.destination,
    departAt: trip.departAt,
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
