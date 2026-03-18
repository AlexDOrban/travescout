/**
 * @param {Object[]} rawOffers
 * @returns {import('../types/trip').Trip[]}
 */
function normalize(rawOffers) {
  return rawOffers.map(offer => ({
    id: `flixbus:${offer.id}`,
    provider: 'flixbus',
    transportType: 'bus',
    origin: offer.origin_city,
    destination: offer.destination_city,
    departAt: offer.departure_time,
    arriveAt: offer.arrival_time,
    durationMins: offer.duration_minutes,
    priceEur: offer.price.amount,
    stops: offer.transfers,
    deepLink: offer.deep_link,
  }));
}

module.exports = { normalize };
