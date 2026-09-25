/**
 * FlixBus provider.
 * TODO: Replace stub with real FlixBus partner API calls when credentials are available.
 * Partner API docs: https://api.flixbus.com (requires business agreement)
 */

/**
 * @param {{ from: string, to: string, departDate: string, adults: number, returnDate?: string }} params
 * @returns {Promise<Object[]>} Raw FlixBus-shaped results
 */
const { stubFare } = require('./stubPricing');

async function search(params) {
  // Stub: returns realistic FlixBus-shaped data
  const base = new Date(`${params.departDate}T06:30:00Z`);
  const arrive = new Date(base.getTime() + 4.5 * 60 * 60 * 1000);

  return [
    {
      id: `flixbus-${params.from}-${params.to}-${params.departDate}-001`,
      price: { amount: stubFare(18, params.departDate) * params.adults, currency: 'EUR' },
      departure_time: base.toISOString(),
      arrival_time: arrive.toISOString(),
      duration_minutes: 270,
      transfers: 0,
      origin_city: params.from,
      destination_city: params.to,
      deep_link: `https://flixbus.com/bus/${params.from.toLowerCase()}-${params.to.toLowerCase()}`,
    },
    {
      id: `flixbus-${params.from}-${params.to}-${params.departDate}-002`,
      price: { amount: stubFare(24, params.departDate) * params.adults, currency: 'EUR' },
      departure_time: new Date(`${params.departDate}T14:00:00Z`).toISOString(),
      arrival_time: new Date(`${params.departDate}T18:30:00Z`).toISOString(),
      duration_minutes: 270,
      transfers: 1,
      origin_city: params.from,
      destination_city: params.to,
      deep_link: `https://flixbus.com/bus/${params.from.toLowerCase()}-${params.to.toLowerCase()}`,
    },
  ];
}

async function book(_booking) {
  // Stub booking — must never run against real money in production.
  if (process.env.NODE_ENV === 'production' && process.env.MOCK_PROVIDERS !== 'true') {
    throw new Error('FlixBus booking is not implemented');
  }
  const { randomUUID } = require('crypto');
  return {
    bookingRef: `FB-${randomUUID().replace(/-/g,'').slice(0,12).toUpperCase()}`,
    status: 'confirmed',
    ticketUrl: null,
  };
}

module.exports = { search, book };
