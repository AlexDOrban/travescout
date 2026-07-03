const db = require('../db');
const User = require('../models/user');
const Trip = require('../models/trip');
const BookingAttempt = require('../models/bookingAttempt');
const StripeService = require('./stripe');
const offerStore = require('./offerStore');

const providers = {
  amadeus: require('../providers/amadeus'),
  flixbus: require('../providers/flixbus'),
  rail: require('../providers/rail'),
};

// Look up the authoritative, server-recorded offer for what the client
// selected. Never trust the client's price/times.
function requoteOrThrow(trip) {
  const offer = offerStore.get(trip.id);
  if (!offer) {
    throw Object.assign(
      new Error('This fare is no longer available — please search again.'),
      { status: 409 }
    );
  }
  if (
    offer.provider !== trip.provider ||
    offer.origin !== trip.origin ||
    offer.destination !== trip.destination
  ) {
    throw Object.assign(
      new Error('Selected offer no longer matches — please search again.'),
      { status: 409 }
    );
  }
  return offer;
}

async function book({ userId, trip, passengers, paymentMethodId, idempotencyKey }) {
  // 1. Validate provider before anything else
  const provider = providers[trip.provider];
  if (!provider || !provider.book) {
    throw Object.assign(new Error(`Unknown provider: ${trip.provider}`), { status: 400 });
  }

  // 2. Re-quote against the authoritative server-side offer (ignore client price)
  const offer = requoteOrThrow(trip);
  const priceEur = offer.priceEur;

  // 3. Get user
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  // 4. Idempotency: claim the key. A completed prior attempt replays its result
  //    (no second charge/booking); an in-flight one is rejected.
  if (idempotencyKey) {
    const claim = await BookingAttempt.claim(idempotencyKey, userId);
    if (!claim.claimed) {
      if (claim.row.user_id !== userId) {
        throw Object.assign(new Error('Invalid idempotency key'), { status: 409 });
      }
      if (claim.row.status === 'completed') return claim.row.response;
      throw Object.assign(new Error('Booking already in progress'), { status: 409 });
    }
  }

  try {
    // 5. Get or create Stripe customer
    const stripeCustomerId = await StripeService.getOrCreateCustomer(
      userId,
      user.email,
      user.stripe_customer_id
    );
    if (stripeCustomerId !== user.stripe_customer_id) {
      await User.setStripeCustomerId(userId, stripeCustomerId);
    }

    // 6. Authorize (manual capture — nothing taken yet). Namespace the Stripe
    //    idempotency key per user so it can't collide with another account.
    const intent = await StripeService.authorize({
      customerId: stripeCustomerId,
      paymentMethodId,
      amountEur: priceEur,
      description: `TraveScout: ${offer.origin} → ${offer.destination} via ${trip.provider}`,
      idempotencyKey: idempotencyKey ? `${userId}:${idempotencyKey}` : undefined,
    });
    if (intent.status === 'requires_action') {
      throw Object.assign(new Error('Payment requires additional authentication'), { status: 402 });
    }
    if (intent.status !== 'requires_capture') {
      throw Object.assign(new Error(`Payment failed: ${intent.status}`), { status: 402 });
    }

    // 7. Book with provider; release the authorization if it fails
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

    // 8. Persist the trip inside a transaction. If the write fails, release the
    //    authorization so the user is never charged for a lost record.
    let savedTrip;
    try {
      savedTrip = await db.withTransaction(tx =>
        Trip.create(
          {
            userId,
            provider: trip.provider,
            bookingRef: booking.bookingRef,
            origin: offer.origin,
            destination: offer.destination,
            departAt: offer.departAt,
            arriveAt: offer.arriveAt || null,
            returnAt: trip.returnAt || null,
            priceEur,
            currencyDisplay: 'EUR',
            status: booking.status,
            rawTicketUrl: booking.ticketUrl || null,
            ticketQrData: booking.bookingRef ? `TICKET:${booking.bookingRef}` : null,
          },
          tx
        )
      );
    } catch (e) {
      await StripeService.cancel(intent.id).catch(err =>
        console.error('[booking] failed to cancel after DB error', intent.id, err)
      );
      throw e;
    }

    // 9. Capture last — the ticket + record already exist. A capture failure
    //    here means the user got the ticket without being charged (revenue
    //    loss, not user harm); log loudly for reconciliation.
    try {
      await StripeService.capture(intent.id);
    } catch (e) {
      console.error('[booking] CRITICAL: capture failed after booking saved', intent.id, e);
    }

    const response = {
      bookingRef: booking.bookingRef,
      status: booking.status,
      trip: savedTrip,
    };
    if (idempotencyKey) await BookingAttempt.complete(idempotencyKey, response);
    return response;
  } catch (e) {
    // Release the idempotency claim on failure so a genuine retry can proceed.
    if (idempotencyKey) await BookingAttempt.release(idempotencyKey).catch(() => {});
    throw e;
  }
}

module.exports = { book };
