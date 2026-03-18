/**
 * Parses Amadeus ISO 8601 duration (e.g. "PT1H15M") to minutes.
 * @param {string} duration
 * @returns {number}
 */
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  const hours = parseInt(match[1] || '0', 10);
  const mins = parseInt(match[2] || '0', 10);
  return hours * 60 + mins;
}

/**
 * @param {Object[]} rawOffers
 * @returns {import('../types/trip').Trip[]}
 */
function normalize(rawOffers) {
  return rawOffers.map(offer => {
    const itinerary = offer.itineraries[0];
    const segments = itinerary.segments;
    const first = segments[0];
    const last = segments[segments.length - 1];
    const stops = segments.length - 1 + segments.reduce((sum, s) => sum + (s.numberOfStops || 0), 0);

    return {
      id: `amadeus:${offer.id}`,
      provider: 'amadeus',
      transportType: 'flight',
      origin: first.departure.iataCode,
      destination: last.arrival.iataCode,
      departAt: first.departure.at,
      arriveAt: last.arrival.at,
      durationMins: parseDuration(itinerary.duration),
      priceEur: parseFloat(offer.price.grandTotal),
      stops,
      deepLink: `https://www.amadeus.com/en/get-inspired/flight-search`,
    };
  });
}

module.exports = { normalize };
