const { rankTrips } = require('../src/ranker');

function makeTrip(overrides) {
  return {
    id: 'test:1',
    provider: 'test',
    transportType: 'bus',
    origin: 'LON',
    destination: 'PAR',
    departAt: '2026-04-15T06:00:00Z',
    arriveAt: '2026-04-15T10:30:00Z',
    durationMins: 270,
    priceEur: 25,
    stops: 0,
    deepLink: 'https://example.com',
    ...overrides,
  };
}

describe('rankTrips', () => {
  it('returns an empty array for empty input', () => {
    expect(rankTrips([])).toEqual([]);
  });

  it('returns a single trip tagged CHEAPEST and FASTEST but not BALANCED', () => {
    const trip = makeTrip({ id: 'test:1' });
    const [result] = rankTrips([trip]);
    expect(result.tags).toContain('CHEAPEST');
    expect(result.tags).toContain('FASTEST');
    // BALANCED means "best third option" — meaningless with fewer than 3 trips.
    expect(result.tags).not.toContain('BALANCED');
  });

  it('assigns CHEAPEST to the lowest-price trip', () => {
    const cheap = makeTrip({ id: 'a', priceEur: 10, durationMins: 300 });
    const expensive = makeTrip({ id: 'b', priceEur: 100, durationMins: 60 });
    const ranked = rankTrips([cheap, expensive]);
    const cheapestTrip = ranked.find(t => t.tags.includes('CHEAPEST'));
    expect(cheapestTrip.id).toBe('a');
  });

  it('assigns FASTEST to the shortest-duration trip', () => {
    const slow = makeTrip({ id: 'a', priceEur: 10, durationMins: 300 });
    const fast = makeTrip({ id: 'b', priceEur: 100, durationMins: 60 });
    const ranked = rankTrips([slow, fast]);
    const fastestTrip = ranked.find(t => t.tags.includes('FASTEST'));
    expect(fastestTrip.id).toBe('b');
  });

  it('assigns BALANCED to the top composite-score trip not already tagged', () => {
    const cheap = makeTrip({ id: 'cheap', priceEur: 10, durationMins: 300, stops: 1 });
    const fast = makeTrip({ id: 'fast', priceEur: 100, durationMins: 60, stops: 0 });
    const balanced = makeTrip({ id: 'bal', priceEur: 40, durationMins: 120, stops: 0 });
    const ranked = rankTrips([cheap, fast, balanced]);
    const balancedTrip = ranked.find(t => t.tags.includes('BALANCED'));
    expect(balancedTrip.id).toBe('bal');
  });

  it('adds a score property to each trip', () => {
    const trips = [makeTrip({ id: 'a' }), makeTrip({ id: 'b', priceEur: 50 })];
    const ranked = rankTrips(trips);
    ranked.forEach(t => expect(typeof t.score).toBe('number'));
  });

  it('sorts by score descending', () => {
    const cheap = makeTrip({ id: 'cheap', priceEur: 10, durationMins: 300 });
    const mid = makeTrip({ id: 'mid', priceEur: 40, durationMins: 180 });
    const expensive = makeTrip({ id: 'exp', priceEur: 100, durationMins: 60 });
    const ranked = rankTrips([expensive, cheap, mid]);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score);
  });

  it('gives direct trips higher convenience than trips with stops', () => {
    const direct = makeTrip({ id: 'direct', priceEur: 50, durationMins: 120, stops: 0 });
    const withStop = makeTrip({ id: 'stop', priceEur: 50, durationMins: 120, stops: 1 });
    const ranked = rankTrips([withStop, direct]);
    const directResult = ranked.find(t => t.id === 'direct');
    const stopResult = ranked.find(t => t.id === 'stop');
    expect(directResult.score).toBeGreaterThan(stopResult.score);
  });
});
