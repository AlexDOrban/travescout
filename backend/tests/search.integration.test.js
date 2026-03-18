require('dotenv').config({ path: '.env.test' });

jest.mock('../src/providers/amadeus', () => ({
  search: jest.fn().mockResolvedValue([
    {
      id: 'offer-flight-1',
      itineraries: [{
        duration: 'PT1H15M',
        segments: [{
          departure: { iataCode: 'LHR', at: '2026-04-15T06:30:00' },
          arrival: { iataCode: 'CDG', at: '2026-04-15T08:45:00' },
          numberOfStops: 0,
        }],
      }],
      price: { grandTotal: '54.00', currency: 'EUR' },
    },
  ]),
}));

jest.mock('../src/providers/flixbus', () => ({
  search: jest.fn().mockResolvedValue([
    {
      id: 'flixbus-LON-PAR-001',
      price: { amount: 18, currency: 'EUR' },
      departure_time: '2026-04-15T06:00:00Z',
      arrival_time: '2026-04-15T10:30:00Z',
      duration_minutes: 270,
      transfers: 0,
      origin_city: 'LON',
      destination_city: 'PAR',
      deep_link: 'https://flixbus.com/bus/lon-par',
    },
  ]),
}));

jest.mock('../src/providers/rail', () => ({
  search: jest.fn().mockResolvedValue([
    {
      id: 'rail-LON-PAR-001',
      fare_price: { amount: 39, currency: 'EUR' },
      departs_at: '2026-04-15T09:01:00Z',
      arrives_at: '2026-04-15T11:16:00Z',
      duration_minutes: 135,
      changes: 0,
      origin: 'LON',
      destination: 'PAR',
      booking_url: 'https://thetrainline.com/lon-to-par',
    },
  ]),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../src/app');

const app = createApp();
const validToken = jwt.sign(
  { sub: 'user-test-123' },
  process.env.JWT_ACCESS_SECRET || 'test_access_secret',
  { expiresIn: '1h' }
);

describe('GET /search', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/search?from=LON&to=PAR&departDate=2026-04-15');
    expect(res.status).toBe(401);
  });

  it('returns 400 if from is missing', async () => {
    const res = await request(app)
      .get('/search?to=PAR&departDate=2026-04-15')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 if departDate is missing', async () => {
    const res = await request(app)
      .get('/search?from=LON&to=PAR')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(400);
  });

  it('returns ranked results from all providers', async () => {
    const res = await request(app)
      .get('/search?from=LON&to=PAR&departDate=2026-04-15')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(3);
    expect(res.body.meta.providersQueried).toEqual(['amadeus', 'flixbus', 'rail']);
    expect(res.body.meta.providersFailed).toEqual([]);
  });

  it('results include score and tags', async () => {
    const res = await request(app)
      .get('/search?from=LON&to=PAR&departDate=2026-04-15')
      .set('Authorization', `Bearer ${validToken}`);
    const results = res.body.results;
    results.forEach(r => {
      expect(typeof r.score).toBe('number');
      expect(Array.isArray(r.tags)).toBe(true);
    });
    const allTags = results.flatMap(r => r.tags);
    expect(allTags).toContain('CHEAPEST');
    expect(allTags).toContain('FASTEST');
    expect(allTags).toContain('BALANCED');
  });

  it('CHEAPEST tag goes to the lowest-price trip', async () => {
    const res = await request(app)
      .get('/search?from=LON&to=PAR&departDate=2026-04-15')
      .set('Authorization', `Bearer ${validToken}`);
    const cheapest = res.body.results.find(r => r.tags.includes('CHEAPEST'));
    const minPrice = Math.min(...res.body.results.map(r => r.priceEur));
    expect(cheapest.priceEur).toBe(minPrice);
  });

  it('still returns results when one provider fails', async () => {
    const amadeusProvider = require('../src/providers/amadeus');
    amadeusProvider.search.mockRejectedValueOnce(new Error('Amadeus down'));

    const res = await request(app)
      .get('/search?from=LON&to=PAR&departDate=2026-04-15')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2); // flixbus + rail only
    expect(res.body.meta.providersFailed).toContain('amadeus');
  });
});
