/**
 * Scores, sorts, and tags an array of normalised Trip objects.
 * @param {import('./types/trip').Trip[]} trips
 * @returns {import('./types/trip').RankedTrip[]}
 */
function rankTrips(trips) {
  // Drop malformed offers (missing/NaN price or duration) so one bad offer
  // can't poison maxPrice/scores and hand every trip a NaN score.
  trips = trips.filter(t => Number.isFinite(t.priceEur) && Number.isFinite(t.durationMins));
  if (trips.length === 0) return [];

  const maxPrice = Math.max(...trips.map(t => t.priceEur));
  const maxDuration = Math.max(...trips.map(t => t.durationMins));

  const scored = trips.map(trip => {
    const priceFactor = maxPrice > 0 ? 1 - trip.priceEur / maxPrice : 1;
    const durationFactor = maxDuration > 0 ? 1 - trip.durationMins / maxDuration : 1;
    const convenienceFactor = trip.stops === 0 ? 1 : 0.5;
    const score = priceFactor * 0.6 + durationFactor * 0.3 + convenienceFactor * 0.1;
    return { ...trip, score, tags: [] };
  });

  scored.sort((a, b) => b.score - a.score);

  // Assign tags
  const cheapest = [...scored].sort((a, b) => a.priceEur - b.priceEur)[0];
  const fastest = [...scored].sort((a, b) => a.durationMins - b.durationMins)[0];
  const tagged = new Set([cheapest.id, fastest.id]);
  // With fewer than 3 distinct options there is no meaningful third pick;
  // don't stack BALANCED onto an already-tagged trip.
  const balanced = scored.length >= 3 ? scored.find(t => !tagged.has(t.id)) : null;

  scored.forEach(trip => {
    if (trip.id === cheapest.id) trip.tags.push('CHEAPEST');
    if (trip.id === fastest.id) trip.tags.push('FASTEST');
    if (balanced && trip.id === balanced.id) trip.tags.push('BALANCED');
  });

  return scored;
}

module.exports = { rankTrips };
