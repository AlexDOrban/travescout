/**
 * FlixBus provider.
 * TODO: Replace stub with real FlixBus partner API calls when credentials are available.
 * Partner API docs: https://api.flixbus.com (requires business agreement)
 */

/**
 * @param {{ from: string, to: string, departDate: string, adults: number, returnDate?: string }} params
 * @returns {Promise<Object[]>} Raw FlixBus-shaped results
 */
async function search(params) {
  // Stub: returns realistic FlixBus-shaped data
  const base = new Date(`${params.departDate}T06:30:00Z`);
  const arrive = new Date(base.getTime() + 4.5 * 60 * 60 * 1000);

  return [
    {
      id: `flixbus-${params.from}-${params.to}-001`,
      price: { amount: 18 * params.adults, currency: 'EUR' },
      departure_time: base.toISOString(),
      arrival_time: arrive.toISOString(),
      duration_minutes: 270,
      transfers: 0,
      origin_city: params.from,
      destination_city: params.to,
      deep_link: `https://flixbus.com/bus/${params.from.toLowerCase()}-${params.to.toLowerCase()}`,
    },
    {
      id: `flixbus-${params.from}-${params.to}-002`,
      price: { amount: 24 * params.adults, currency: 'EUR' },
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

module.exports = { search };
