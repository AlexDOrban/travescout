require('dotenv').config({ path: '.env.test' });

// Each provider returns one offer whose price depends on the requested date,
// so the per-day minimum is predictable.
const DAY_PRICE = { '2030-05-01': 40, '2030-05-02': 25, '2030-05-03': 60 };

jest.mock('../src/providers/amadeus', () => ({ search: jest.fn() }));
jest.mock('../src/providers/flixbus', () => ({ search: jest.fn() }));
jest.mock('../src/providers/rail', () => ({ search: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../src/app');
const amadeus = require('../src/providers/amadeus');
const flixbus = require('../src/providers/flixbus');
const rail = require('../src/providers/rail');
const { clearPriceCache } = require('../src/services/searchPrices');

const app = createApp();
const token = jwt.sign(
  { sub: 'user-test-123' },
  process.env.JWT_ACCESS_SECRET || 'test_access_secret',
  { expiresIn: '1h' }
);

function busOffer(date, amount) {
  return {
    id: `flixbus-${date}`,
    price: { amount, currency: 'EUR' },
    departure_time: `${date}T06:00:00Z`,
    arrival_time: `${date}T10:30:00Z`,
    duration_minutes: 270,
    transfers: 0,
    origin_city: 'LON',
    destination_city: 'PAR',
    deep_link: 'https://flixbus.com',
  };
}

function railOffer(date, amount) {
  return {
    id: `rail-${date}`,
    fare_price: { amount, currency: 'EUR' },
    departs_at: `${date}T09:00:00Z`,
    arrives_at: `${date}T11:15:00Z`,
    duration_minutes: 135,
    changes: 0,
    origin: 'LON',
    destination: 'PAR',
    booking_url: 'https://thetrainline.com',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  clearPriceCache();
  amadeus.search.mockResolvedValue([]);
  flixbus.search.mockImplementation(async p =>
    DAY_PRICE[p.departDate] ? [busOffer(p.departDate, DAY_PRICE[p.departDate])] : []);
  rail.search.mockImplementation(async p =>
    DAY_PRICE[p.departDate] ? [railOffer(p.departDate, DAY_PRICE[p.departDate] + 5)] : []);
});

const get = q => request(app).get(`/search/prices?${q}`).set('Authorization', `Bearer ${token}`);

describe('GET /search/prices', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/search/prices?from=LON&to=PAR&startDate=2030-05-01');
    expect(res.status).toBe(401);
  });

  it('returns the cheapest price per day across providers', async () => {
    const res = await get('from=LON&to=PAR&startDate=2030-05-01&days=4');
    expect(res.status).toBe(200);
    expect(res.body.prices).toEqual([
      { date: '2030-05-01', minPriceEur: 40 },
      { date: '2030-05-02', minPriceEur: 25 },
      { date: '2030-05-03', minPriceEur: 60 },
      { date: '2030-05-04', minPriceEur: null },
    ]);
  });

  it('passes adults through to the providers', async () => {
    await get('from=LON&to=PAR&startDate=2030-05-01&days=1&adults=3');
    expect(flixbus.search).toHaveBeenCalledWith(expect.objectContaining({ adults: 3, departDate: '2030-05-01' }));
  });

  it('defaults to 7 days', async () => {
    const res = await get('from=LON&to=PAR&startDate=2030-05-01');
    expect(res.body.prices).toHaveLength(7);
    expect(res.body.prices[6].date).toBe('2030-05-07');
  });

  it('rolls dates across month ends', async () => {
    const res = await get('from=LON&to=PAR&startDate=2030-01-30&days=3');
    expect(res.body.prices.map(p => p.date)).toEqual(['2030-01-30', '2030-01-31', '2030-02-01']);
  });

  it('rejects more than 14 days and invalid dates', async () => {
    expect((await get('from=LON&to=PAR&startDate=2030-05-01&days=15')).status).toBe(400);
    expect((await get('from=LON&to=PAR&startDate=2030-02-30')).status).toBe(400);
    expect((await get('from=LON&startDate=2030-05-01')).status).toBe(400);
  });

  it('caches per route/date so repeat calls do not re-query providers', async () => {
    await get('from=LON&to=PAR&startDate=2030-05-01&days=2');
    await get('from=LON&to=PAR&startDate=2030-05-01&days=2');
    expect(flixbus.search).toHaveBeenCalledTimes(2);
  });

  it('marks a day null when every provider fails for it', async () => {
    flixbus.search.mockRejectedValue(new Error('down'));
    rail.search.mockRejectedValue(new Error('down'));
    amadeus.search.mockRejectedValue(new Error('down'));
    const res = await get('from=LON&to=PAR&startDate=2030-05-01&days=1');
    expect(res.status).toBe(200);
    expect(res.body.prices).toEqual([{ date: '2030-05-01', minPriceEur: null }]);
  });
});
