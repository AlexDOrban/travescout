const crypto = require('crypto');
const db = require('../db');
const User = require('../models/user');
const Trip = require('../models/trip');
const Itinerary = require('../models/itinerary');
const BookingAttempt = require('../models/bookingAttempt');
const StripeService = require('./stripe');
const offerStore = require('./offerStore');
const providers = require('../providers');

// Longer, collision-resistant reference (was 8 hex chars).
function makeRef(prefix) {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

function requoteLegOrThrow(leg) {
  const offer = offerStore.get(leg.id);
  if (!offer) {
    throw Object.assign(
      new Error('One of your fares is no longer available — please search again.'),
      { status: 409 }
    );
  }
  if (offer.provider !== leg.provider || offer.origin !== leg.origin || offer.destination !== leg.destination) {
    throw Object.assign(
      new Error('Selected offer no longer matches — please search again.'),
      { status: 409 }
    );
  }
  return offer;
}

// Uses the server-side offers, never client times: the return's first leg must
// leave after the outbound's last leg arrives.
function assertReturnAfterOutbound(legs, offers) {
  const firstReturn = legs.findIndex(l => l.direction === 'return');
  const outboundArrive = new Date(offers[firstReturn - 1].arriveAt).getTime();
  const returnDepart = new Date(offers[firstReturn].departAt).getTime();
  if (!(returnDepart > outboundArrive)) {
    throw Object.assign(new Error('Return must depart after the outbound arrives'), { status: 400 });
  }
}

async function bookItinerary({ userId, legs, passengers, paymentMethodId, origin, destination, idempotencyKey, tripType = 'one_way' }) {
  // 1. Resolve all leg providers before any money moves
  const legProviders = legs.map(leg => providers.getProvider(leg.provider));

  // 2. Re-quote every leg against the authoritative server-side offers
  const offers = legs.map(requoteLegOrThrow);
  if (tripType === 'round_trip') assertReturnAfterOutbound(legs, offers);
  const totalPriceEur = offers.reduce((sum, o) => sum + o.priceEur, 0);

  // 3. Get user
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  // 4. Idempotency claim
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

    // 6. Authorize the full amount (manual capture)
    const intent = await StripeService.authorize({
      customerId: stripeCustomerId,
      paymentMethodId,
      amountEur: totalPriceEur,
      description: tripType === 'round_trip'
        ? `TraveScout Round trip: ${origin} ⇄ ${destination} (${legs.length} legs)`
        : `TraveScout Itinerary: ${origin} → ${destination} (${legs.length} legs)`,
      idempotencyKey: idempotencyKey ? `${userId}:${idempotencyKey}` : undefined,
    });
    if (intent.status !== 'requires_capture') {
      throw Object.assign(new Error('Payment failed'), { status: 402 });
    }

    // 7. Book each leg with its provider
    const bookingResults = await Promise.allSettled(
      legs.map((leg, i) => legProviders[i].book({ trip: leg, passengers }))
    );

    const failedLegs = [];
    let succeededPriceEur = 0;
    bookingResults.forEach((result, i) => {
      if (result.status === 'rejected') {
        failedLegs.push({ legOrder: i, error: result.reason?.message || 'Booking failed' });
      } else {
        succeededPriceEur += offers[i].priceEur;
      }
    });

    // All legs failed → release the whole authorization, no records.
    if (succeededPriceEur === 0) {
      await StripeService.cancel(intent.id).catch(err =>
        console.error('[itinerary] failed to cancel payment intent', intent.id, err)
      );
      throw Object.assign(new Error('All leg bookings failed — payment was not captured'), { status: 502 });
    }

    const status = failedLegs.length > 0 ? 'partially_failed' : 'confirmed';
    const bookingRef = makeRef('TS');
    const firstOffer = offers[0];
    const lastOffer = offers[offers.length - 1];

    // 8. Persist itinerary + all legs atomically. On failure, release the auth.
    let savedItinerary;
    try {
      savedItinerary = await db.withTransaction(async tx => {
        const itinerary = await Itinerary.create(
          {
            userId,
            bookingRef,
            origin,
            destination,
            departAt: firstOffer.departAt,
            arriveAt: lastOffer.arriveAt,
            totalPriceEur: succeededPriceEur,
            status,
            tripType,
          },
          tx
        );

        const savedLegs = [];
        for (let i = 0; i < legs.length; i++) {
          const leg = legs[i];
          const offer = offers[i];
          const result = bookingResults[i];
          const succeeded = result.status === 'fulfilled';
          const providerResult = succeeded ? result.value : null;

          const savedLeg = await Trip.create(
            {
              userId,
              provider: leg.provider,
              bookingRef: providerResult?.bookingRef || null,
              origin: offer.origin,
              destination: offer.destination,
              departAt: offer.departAt,
              arriveAt: offer.arriveAt,
              priceEur: offer.priceEur,
              status: succeeded ? 'confirmed' : 'failed',
              rawTicketUrl: providerResult?.ticketUrl || null,
              ticketQrData: providerResult ? `TICKET:${providerResult.bookingRef}` : null,
              itineraryId: itinerary.id,
              legOrder: i,
              direction: leg.direction || 'outbound',
            },
            tx
          );
          savedLegs.push(savedLeg);
        }
        return { ...itinerary, legs: savedLegs };
      });
    } catch (e) {
      await StripeService.cancel(intent.id).catch(err =>
        console.error('[itinerary] failed to cancel after DB error', intent.id, err)
      );
      throw e;
    }

    // 9. Capture only the succeeded legs' amount; the rest of the auth releases.
    try {
      await StripeService.capture(intent.id, succeededPriceEur);
    } catch (e) {
      console.error('[itinerary] CRITICAL: capture failed after booking saved', intent.id, e);
    }

    const response = {
      bookingRef,
      status,
      itinerary: savedItinerary,
      ...(failedLegs.length > 0 ? { failedLegs } : {}),
    };
    if (idempotencyKey) await BookingAttempt.complete(idempotencyKey, response);
    return response;
  } catch (e) {
    if (idempotencyKey) await BookingAttempt.release(idempotencyKey).catch(() => {});
    throw e;
  }
}

module.exports = { bookItinerary };
