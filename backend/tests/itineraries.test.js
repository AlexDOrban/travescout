require('dotenv').config({ path: '.env.test' });

// Mock Stripe and providers (this test books an itinerary to verify listing)
jest.mock('../src/services/stripe', () => ({
  getOrCreateCustomer: jest.fn().mockResolvedValue('cus_test_123'),
  authorize: jest.fn().mockResolvedValue({ id: 'pi_test_123', status: 'requires_capture' }),
  capture: jest.fn().mockResolvedValue({ id: 'pi_test_123', status: 'succeeded' }),
  cancel: jest.fn().mockResolvedValue({ id: 'pi_test_123', status: 'canceled' }),
}));
jest.mock('../src/providers/flixbus', () => ({
  search: jest.fn(),
  book: jest.fn().mockResolvedValue({ bookingRef: 'FB-LIST-001', status: 'confirmed', ticketUrl: null }),
}));
jest.mock('../src/providers/rail', () => ({
  search: jest.fn(),
  book: jest.fn().mockResolvedValue({ bookingRef: 'TL-LIST-001', status: 'confirmed', ticketUrl: null }),
}));
jest.mock('../src/providers/amadeus', () => ({
  search: jest.fn(),
  book: jest.fn().mockResolvedValue({ bookingRef: 'AM-LIST-001', status: 'confirmed', ticketUrl: null }),
}));

const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db');
const offerStore = require('../src/services/offerStore');

const LIST_LEG = {
  id: 'flixbus:list-1', provider: 'flixbus', transportType: 'bus',
  origin: 'LON', destination: 'PAR', originName: 'London Victoria',
  destinationName: 'Paris Bercy', departAt: '2030-07-01T08:00:00Z',
  arriveAt: '2030-07-01T14:00:00Z', durationMins: 360, priceEur: 25,
  stops: 0, deepLink: 'https://flixbus.com',
};

async function getAuthToken(app) {
  await request(app).post('/auth/register').send({
    email: 'itin-list@test.com', password: 'password123',
  });
  const res = await request(app).post('/auth/login').send({
    email: 'itin-list@test.com', password: 'password123',
  });
  return res.body.accessToken;
}

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

describe('GET /itineraries', () => {
  it('returns empty array when no itineraries', async () => {
    const res = await request(app)
      .get('/itineraries')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.itineraries).toEqual([]);
  });

  it('returns itineraries after booking', async () => {
    offerStore.remember([LIST_LEG]);
    // Book an itinerary first
    await request(app)
      .post('/book/itinerary')
      .set('Authorization', `Bearer ${token}`)
      .send({
        legs: [LIST_LEG],
        passengers: [{ name: 'Test', email: 'test@test.com' }],
        paymentMethodId: 'pm_card_visa',
        origin: 'LON',
        destination: 'PAR',
      });

    const res = await request(app)
      .get('/itineraries')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.itineraries.length).toBeGreaterThan(0);
    expect(res.body.itineraries[0]).toHaveProperty('booking_ref');
    expect(res.body.itineraries[0]).toHaveProperty('legs');
    expect(res.body.itineraries[0].legs.length).toBeGreaterThan(0);
    // arrive_at now surfaces on legs (was previously dropped).
    expect(res.body.itineraries[0].legs[0]).toHaveProperty('arrive_at');

    const listed = res.body.itineraries[0];
    // Rows booked without a tripType read back as one-way / outbound.
    expect(listed.trip_type).toBe('one_way');
    expect(listed.legs[0].direction).toBe('outbound');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/itineraries');
    expect(res.status).toBe(401);
  });
});
