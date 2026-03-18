const Amadeus = require('amadeus');

/**
 * @param {{ from: string, to: string, departDate: string, adults: number }} params
 * @returns {Promise<Object[]>} Raw Amadeus flight offer objects
 */
async function search(params) {
  const client = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET,
    hostname: process.env.AMADEUS_HOSTNAME || 'test',
  });

  const response = await client.shopping.flightOffersSearch.get({
    originLocationCode: params.from,
    destinationLocationCode: params.to,
    departureDate: params.departDate,
    adults: params.adults,
    currencyCode: 'EUR',
    max: 10,
  });

  return response.data || [];
}

async function book({ trip, passengers }) {
  return {
    bookingRef: `AM-${Date.now()}`,
    status: 'confirmed',
    ticketUrl: null,
  };
}

module.exports = { search, book };
