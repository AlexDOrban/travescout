const { fanOut } = require('../providers/index');
const { rankTrips } = require('../ranker');

/**
 * @param {Object} params - Validated search params
 * @returns {Promise<{ results: import('../types/trip').RankedTrip[], meta: Object }>}
 */
async function search(params) {
  const { trips, providersFailed } = await fanOut(params);
  const results = rankTrips(trips);

  return {
    results,
    meta: {
      from: params.from,
      to: params.to,
      departDate: params.departDate,
      adults: params.adults,
      providersQueried: ['amadeus', 'flixbus', 'rail'],
      providersFailed,
    },
  };
}

module.exports = { search };
