const { normalize } = require('../../src/normalizers/rail');

const rawOffer = {
  id: 'rail-LON-PAR-001',
  fare_price: { amount: 39, currency: 'EUR' },
  departs_at: '2026-04-15T09:01:00Z',
  arrives_at: '2026-04-15T11:16:00Z',
  duration_minutes: 135,
  changes: 0,
  origin: 'LON',
  destination: 'PAR',
  booking_url: 'https://thetrainline.com/lon-to-par',
};

describe('Rail normalizer', () => {
  it('maps a raw offer to a Trip', () => {
    const [trip] = normalize([rawOffer]);
    expect(trip.id).toBe('rail:rail-LON-PAR-001');
    expect(trip.provider).toBe('rail');
    expect(trip.transportType).toBe('train');
    expect(trip.origin).toBe('LON');
    expect(trip.destination).toBe('PAR');
    expect(trip.departAt).toBe('2026-04-15T09:01:00Z');
    expect(trip.durationMins).toBe(135);
    expect(trip.priceEur).toBe(39);
    expect(trip.stops).toBe(0);
    expect(trip.deepLink).toBe('https://thetrainline.com/lon-to-par');
  });

  it('returns empty array for empty input', () => {
    expect(normalize([])).toEqual([]);
  });
});
