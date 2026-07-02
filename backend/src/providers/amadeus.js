const Amadeus = require('amadeus');

// Single client: each instance manages its own OAuth token, so per-request
// construction refetches tokens and burns rate limit.
let client;
function getClient() {
  if (!client) {
    client = new Amadeus({
      clientId: process.env.AMADEUS_CLIENT_ID,
      clientSecret: process.env.AMADEUS_CLIENT_SECRET,
      hostname: process.env.AMADEUS_HOSTNAME || 'test',
    });
  }
  return client;
}

/**
 * @param {{ from: string, to: string, departDate: string, adults: number, returnDate?: string }} params
 * @returns {Promise<Object[]>} Raw Amadeus flight offer objects
 */
async function search(params) {
  const response = await getClient().shopping.flightOffersSearch.get({
    originLocationCode: params.from,
    destinationLocationCode: params.to,
    departureDate: params.departDate,
    ...(params.returnDate ? { returnDate: params.returnDate } : {}),
    adults: params.adults,
    currencyCode: 'EUR',
    max: 10,
  });

  return response.data || [];
}

async function book({ trip, passengers }) {
  // Stub booking — must never run against real money in production.
  if (process.env.NODE_ENV === 'production' && process.env.MOCK_PROVIDERS !== 'true') {
    throw new Error('Amadeus booking is not implemented');
  }
  const { randomUUID } = require('crypto');
  return {
    bookingRef: `AM-${randomUUID().split('-')[0].toUpperCase()}`,
    status: 'confirmed',
    ticketUrl: null,
  };
}

module.exports = { search, book };
