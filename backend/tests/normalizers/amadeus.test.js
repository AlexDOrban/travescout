const { normalize } = require('../../src/normalizers/amadeus');

const rawOffer = {
  id: 'offer-abc',
  itineraries: [
    {
      duration: 'PT1H15M',
      segments: [
        {
          departure: { iataCode: 'LHR', at: '2026-04-15T06:30:00' },
          arrival: { iataCode: 'CDG', at: '2026-04-15T08:45:00' },
          numberOfStops: 0,
        },
      ],
    },
  ],
  price: { grandTotal: '54.00', currency: 'EUR' },
};

describe('Amadeus normalizer', () => {
  it('maps a raw offer to a Trip', () => {
    const [trip] = normalize([rawOffer]);
    expect(trip.id).toBe('amadeus:offer-abc');
    expect(trip.provider).toBe('amadeus');
    expect(trip.transportType).toBe('flight');
    expect(trip.origin).toBe('LHR');
    expect(trip.destination).toBe('CDG');
    expect(trip.departAt).toBe('2026-04-15T06:30:00');
    expect(trip.arriveAt).toBe('2026-04-15T08:45:00');
    expect(trip.durationMins).toBe(75);
    expect(trip.priceEur).toBe(54);
    expect(trip.stops).toBe(0);
    expect(trip.deepLink).toBeDefined();
  });

  it('returns empty array for empty input', () => {
    expect(normalize([])).toEqual([]);
  });
});
