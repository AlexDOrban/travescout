/**
 * @param {Object[]} rawOffers
 * @returns {import('../types/trip').Trip[]}
 */
function normalize(rawOffers) {
  return rawOffers.map(offer => ({
    id: `rail:${offer.id}`,
    provider: 'rail',
    transportType: 'train',
    origin: offer.origin,
    destination: offer.destination,
    departAt: offer.departs_at,
    arriveAt: offer.arrives_at,
    durationMins: offer.duration_minutes,
    priceEur: offer.fare_price.amount,
    stops: offer.changes,
    deepLink: offer.booking_url,
  }));
}

module.exports = { normalize };
