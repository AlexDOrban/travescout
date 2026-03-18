const { search } = require('../../src/providers/flixbus');

describe('FlixBus provider stub', () => {
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
      expect(r).toHaveProperty('price.amount');
      expect(r).toHaveProperty('departure_time');
      expect(r).toHaveProperty('arrival_time');
      expect(r).toHaveProperty('duration_minutes');
      expect(r).toHaveProperty('transfers');
      expect(r).toHaveProperty('deep_link');
    });
  });
});

describe('FlixBus provider book stub', () => {
  const params = {
    trip: { provider: 'flixbus', origin: 'LON', destination: 'PAR' },
    passengers: [{ name: 'John Doe', email: 'john@example.com' }],
  };

  it('returns a booking reference starting with FB-', async () => {
    const { book } = require('../../src/providers/flixbus');
    const result = await book(params);
    expect(result.bookingRef).toMatch(/^FB-/);
  });

  it('returns confirmed status', async () => {
    const { book } = require('../../src/providers/flixbus');
    const result = await book(params);
    expect(result.status).toBe('confirmed');
  });
});
