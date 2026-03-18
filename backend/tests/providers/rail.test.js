const { search } = require('../../src/providers/rail');

describe('Rail provider stub', () => {
  const params = { from: 'LON', to: 'PAR', departDate: '2026-04-15', adults: 1 };

  it('returns an array', async () => {
    const results = await search(params);
    expect(Array.isArray(results)).toBe(true);
  });

  it('returns at least one result', async () => {
    const results = await search(params);
    expect(results.length).toBeGreaterThan(0);
  });

  it('each result has required fields', async () => {
    const results = await search(params);
    results.forEach(r => {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('fare_price');
      expect(r).toHaveProperty('departs_at');
      expect(r).toHaveProperty('arrives_at');
      expect(r).toHaveProperty('duration_minutes');
      expect(r).toHaveProperty('changes');
      expect(r).toHaveProperty('booking_url');
    });
  });
});

describe('Rail provider book stub', () => {
  const params = {
    trip: { provider: 'rail', origin: 'LON', destination: 'PAR' },
    passengers: [{ name: 'Jane Doe', email: 'jane@example.com' }],
  };

  it('returns a booking reference starting with TL-', async () => {
    const { book } = require('../../src/providers/rail');
    const result = await book(params);
    expect(result.bookingRef).toMatch(/^TL-/);
  });

  it('returns confirmed status', async () => {
    const { book } = require('../../src/providers/rail');
    const result = await book(params);
    expect(result.status).toBe('confirmed');
  });
});
