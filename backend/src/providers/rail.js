/**
 * Rail provider.
 * TODO: Replace stub with Trainline or Deutsche Bahn API when partner access is available.
 * DB API docs: https://developers.deutschebahn.com
 * Trainline API: requires business agreement.
 */

/**
 * @param {{ from: string, to: string, departDate: string, adults: number, returnDate?: string }} params
 * @returns {Promise<Object[]>} Raw rail-shaped results
 */
async function search(params) {
  const base = new Date(`${params.departDate}T09:01:00Z`);
  const arrive = new Date(base.getTime() + 2.25 * 60 * 60 * 1000);

  return [
    {
      id: `rail-${params.from}-${params.to}-001`,
      fare_price: { amount: 39 * params.adults, currency: 'EUR' },
      departs_at: base.toISOString(),
      arrives_at: arrive.toISOString(),
      duration_minutes: 135,
      changes: 0,
      origin: params.from,
      destination: params.to,
      booking_url: `https://www.thetrainline.com/${params.from.toLowerCase()}-to-${params.to.toLowerCase()}`,
    },
    {
      id: `rail-${params.from}-${params.to}-002`,
      fare_price: { amount: 55 * params.adults, currency: 'EUR' },
      departs_at: new Date(`${params.departDate}T11:30:00Z`).toISOString(),
      arrives_at: new Date(`${params.departDate}T14:15:00Z`).toISOString(),
      duration_minutes: 165,
      changes: 1,
      origin: params.from,
      destination: params.to,
      booking_url: `https://www.thetrainline.com/${params.from.toLowerCase()}-to-${params.to.toLowerCase()}`,
    },
  ];
}

async function book({ trip, passengers }) {
  return {
    bookingRef: `TL-${Date.now()}`,
    status: 'confirmed',
    ticketUrl: null,
  };
}

module.exports = { search, book };
