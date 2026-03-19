require('dotenv').config({ path: '.env.test' });

// Mock Stripe (follows existing booking.integration.test.js pattern)
jest.mock('../src/services/stripe', () => ({
  getOrCreateCustomer: jest.fn().mockResolvedValue('cus_test_123'),
  charge: jest.fn().mockResolvedValue({ id: 'pi_test_123', status: 'succeeded' }),
}));

// Mock providers
jest.mock('../src/providers/flixbus', () => ({
  search: jest.fn(),
  book: jest.fn().mockResolvedValue({ bookingRef: 'FB-ITIN-001', status: 'confirmed', ticketUrl: null }),
}));
jest.mock('../src/providers/rail', () => ({
  search: jest.fn(),
  book: jest.fn().mockResolvedValue({ bookingRef: 'TL-ITIN-001', status: 'confirmed', ticketUrl: null }),
}));
jest.mock('../src/providers/amadeus', () => ({
  search: jest.fn(),
  book: jest.fn().mockResolvedValue({ bookingRef: 'AM-ITIN-001', status: 'confirmed', ticketUrl: null }),
}));

const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db');

async function getAuthToken(app) {
  await request(app).post('/auth/register').send({
    email: 'itin-test@test.com', password: 'password123',
  });
  const res = await request(app).post('/auth/login').send({
    email: 'itin-test@test.com', password: 'password123',
  });
  return res.body.accessToken;
}

const MOCK_LEGS = [
  {
    id: 'flixbus:test-1', provider: 'flixbus', transportType: 'bus',
    origin: 'BUD', destination: 'VIE', originName: 'Budapest Népliget',
    destinationName: 'Vienna Erdberg', departAt: '2030-06-15T08:00:00Z',
    arriveAt: '2030-06-15T10:30:00Z', durationMins: 150, priceEur: 15,
    stops: 0, deepLink: 'https://flixbus.com',
  },
  {
    id: 'amadeus:test-2', provider: 'amadeus', transportType: 'flight',
    origin: 'VIE', destination: 'NCE', originName: 'Vienna Schwechat',
    destinationName: "Nice Côte d'Azur", departAt: '2030-06-15T14:00:00Z',
    arriveAt: '2030-06-15T16:10:00Z', durationMins: 130, priceEur: 62,
    stops: 0, deepLink: 'https://amadeus.com',
  },
];

let app, token;

beforeAll(async () => {
  app = createApp();
  token = await getAuthToken(app);
});

afterAll(async () => {
  await db.query('DELETE FROM trips');
  await db.query('DELETE FROM itineraries');
  await db.query('DELETE FROM users');
});

describe('POST /book/itinerary', () => {
  it('books a multi-leg itinerary', async () => {
    const res = await request(app)
      .post('/book/itinerary')
      .set('Authorization', `Bearer ${token}`)
      .send({
        legs: MOCK_LEGS,
        passengers: [{ name: 'Test User', email: 'test@test.com' }],
        paymentMethodId: 'pm_card_visa',
        origin: 'BUD',
        destination: 'NCE',
      });

    expect(res.status).toBe(201);
    expect(res.body.bookingRef).toMatch(/^TS-/);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.itinerary).toHaveProperty('id');
    expect(res.body.itinerary).toHaveProperty('legs');
    expect(res.body.itinerary.legs).toHaveLength(2);
    expect(res.body.itinerary.origin).toBe('BUD');
    expect(res.body.itinerary.destination).toBe('NCE');
  });

  it('returns 400 for empty legs', async () => {
    const res = await request(app)
      .post('/book/itinerary')
      .set('Authorization', `Bearer ${token}`)
      .send({
        legs: [],
        passengers: [{ name: 'Test', email: 'test@test.com' }],
        paymentMethodId: 'pm_card_visa',
        origin: 'BUD',
        destination: 'NCE',
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 for missing passengers', async () => {
    const res = await request(app)
      .post('/book/itinerary')
      .set('Authorization', `Bearer ${token}`)
      .send({
        legs: MOCK_LEGS,
        passengers: [],
        paymentMethodId: 'pm_card_visa',
        origin: 'BUD',
        destination: 'NCE',
      });

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/book/itinerary')
      .send({
        legs: MOCK_LEGS,
        passengers: [{ name: 'Test', email: 'test@test.com' }],
        paymentMethodId: 'pm_card_visa',
        origin: 'BUD',
        destination: 'NCE',
      });

    expect(res.status).toBe(401);
  });
});
