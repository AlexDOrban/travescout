const { normalize } = require('../../src/normalizers/flixbus');

const rawOffer = {
  id: 'flixbus-LON-PAR-001',
  price: { amount: 18, currency: 'EUR' },
  departure_time: '2026-04-15T06:30:00Z',
  arrival_time: '2026-04-15T11:00:00Z',
  duration_minutes: 270,
  transfers: 0,
  origin_city: 'LON',
  destination_city: 'PAR',
  deep_link: 'https://flixbus.com/bus/lon-par',
};

describe('FlixBus normalizer', () => {
  it('maps a raw offer to a Trip', () => {
    const [trip] = normalize([rawOffer]);
    expect(trip.id).toBe('flixbus:flixbus-LON-PAR-001');
    expect(trip.provider).toBe('flixbus');
    expect(trip.transportType).toBe('bus');
    expect(trip.origin).toBe('LON');
    expect(trip.destination).toBe('PAR');
    expect(trip.departAt).toBe('2026-04-15T06:30:00Z');
    expect(trip.durationMins).toBe(270);
    expect(trip.priceEur).toBe(18);
    expect(trip.stops).toBe(0);
    expect(trip.deepLink).toBe('https://flixbus.com/bus/lon-par');
  });

  it('returns empty array for empty input', () => {
    expect(normalize([])).toEqual([]);
  });
});
