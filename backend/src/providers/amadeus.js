const Amadeus = require('amadeus');
const { getHubsForCity } = require('../data/hubs');

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

const PLACEHOLDER_RE = /^(sandbox|your_|xxx|changeme|placeholder|test_key)/i;

function credentialsMisconfigured() {
  const id = process.env.AMADEUS_CLIENT_ID;
  return !id || PLACEHOLDER_RE.test(id);
}

// Once the API rejects our credentials there is no point retrying per search.
let authRejected = false;

function airportFor(cityCode) {
  const airport = getHubsForCity(cityCode).find(h => h.type === 'airport');
  return airport ? airport.code : cityCode;
}

// Deterministic per-route variation so stub prices/times don't look canned.
function routeSeed(from, to) {
  let h = 0;
  for (const ch of `${from}-${to}`) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return h;
}

/**
 * Realistic Amadeus-shaped stub offers, used when no valid API credentials
 * are configured. Same pattern as the flixbus/rail stub providers.
 * @returns {Object[]} Raw Amadeus flight offer objects
 */
function stubOffers(params) {
  const from = airportFor(params.from);
  const to = airportFor(params.to);
  const seed = routeSeed(from, to);
  const basePrice = 45 + (seed % 60); // €45–€104 per person
  const durationMins = 75 + (seed % 90); // 1h15m–2h44m direct

  const offer = (idSuffix, departHour, departMin, flightMins, price, stops) => {
    const depart = new Date(`${params.departDate}T00:00:00Z`);
    depart.setUTCHours(departHour, departMin, 0, 0);
    const arrive = new Date(depart.getTime() + flightMins * 60 * 1000);
    const dur = `PT${Math.floor(flightMins / 60)}H${flightMins % 60}M`;
    const iso = d => d.toISOString().slice(0, 19);
    return {
      id: `stub-${from}-${to}-${idSuffix}`,
      itineraries: [{
        duration: dur,
        segments: [{
          departure: { iataCode: from, at: iso(depart) },
          arrival: { iataCode: to, at: iso(arrive) },
          numberOfStops: stops,
        }],
      }],
      price: { grandTotal: (price * params.adults).toFixed(2), currency: 'EUR' },
    };
  };

  return [
    offer('001', 7, 10 + (seed % 40), durationMins, basePrice + 30, 0),
    offer('002', 14, (seed % 50), durationMins + 10, basePrice, 0),
    offer('003', 18, 25, durationMins + 95, Math.max(29, basePrice - 16), 1),
  ];
}

/**
 * @param {{ from: string, to: string, departDate: string, adults: number, returnDate?: string }} params
 * @returns {Promise<Object[]>} Raw Amadeus flight offer objects
 */
async function search(params) {
  if (credentialsMisconfigured() || authRejected) {
    return stubOffers(params);
  }

  try {
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
  } catch (e) {
    const status = e.response?.statusCode;
    if (e.constructor?.name === 'AuthenticationError' || status === 401) {
      console.warn('[amadeus] API credentials rejected — serving stub flight data until restart');
      authRejected = true;
      return stubOffers(params);
    }
    throw e;
  }
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
