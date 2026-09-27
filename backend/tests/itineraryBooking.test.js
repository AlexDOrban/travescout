require('dotenv').config({ path: '.env.test' });

// Mock Stripe (follows existing booking.integration.test.js pattern)
jest.mock('../src/services/stripe', () => ({
  getOrCreateCustomer: jest.fn().mockResolvedValue('cus_test_123'),
  authorize: jest.fn().mockResolvedValue({ id: 'pi_test_123', status: 'requires_capture' }),
  capture: jest.fn().mockResolvedValue({ id: 'pi_test_123', status: 'succeeded' }),
  cancel: jest.fn().mockResolvedValue({ id: 'pi_test_123', status: 'canceled' }),
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
const offerStore = require('../src/services/offerStore');

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

// Seed the authoritative offers each leg re-quotes against.
beforeEach(() => {
  offerStore.remember(MOCK_LEGS);
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

describe('POST /book/itinerary — round trips', () => {
  const flixbus = require('../src/providers/flixbus');
  const amadeus = require('../src/providers/amadeus');
  const StripeService = require('../src/services/stripe');

  const RETURN_LEGS = [
    {
      id: 'amadeus:ret-1', provider: 'amadeus', transportType: 'flight',
      origin: 'NCE', destination: 'VIE', originName: "Nice Côte d'Azur",
      destinationName: 'Vienna Schwechat', departAt: '2030-06-20T09:00:00Z',
      arriveAt: '2030-06-20T11:10:00Z', durationMins: 130, priceEur: 70,
      stops: 0, deepLink: 'https://amadeus.com', direction: 'return',
    },
    {
      id: 'flixbus:ret-2', provider: 'flixbus', transportType: 'bus',
      origin: 'VIE', destination: 'BUD', originName: 'Vienna Erdberg',
      destinationName: 'Budapest Népliget', departAt: '2030-06-20T14:00:00Z',
      arriveAt: '2030-06-20T16:30:00Z', durationMins: 150, priceEur: 14,
      stops: 0, deepLink: 'https://flixbus.com', direction: 'return',
    },
  ];
  const OUT_LEGS = MOCK_LEGS.map(l => ({ ...l, direction: 'outbound' }));
  const body = (legs, over = {}) => ({
    legs,
    passengers: [{ name: 'Test User', email: 'test@test.com' }],
    paymentMethodId: 'pm_card_visa',
    origin: 'BUD',
    destination: 'NCE',
    tripType: 'round_trip',
    ...over,
  });

  // Provider refs must be unique (trips.booking_ref has a unique index).
  let seq = 0;
  const okBooking = async () => ({ bookingRef: `RT-${Date.now()}-${++seq}`, status: 'confirmed', ticketUrl: null });

  beforeEach(() => {
    offerStore.remember([...MOCK_LEGS, ...RETURN_LEGS]);
    flixbus.book.mockImplementation(okBooking);
    amadeus.book.mockImplementation(okBooking);
    StripeService.authorize.mockClear();
    StripeService.capture.mockClear();
  });

  it('books both directions under one reference and stores trip_type + direction', async () => {
    const res = await request(app)
      .post('/book/itinerary')
      .set('Authorization', `Bearer ${token}`)
      .send(body([...OUT_LEGS, ...RETURN_LEGS]));

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.itinerary.trip_type).toBe('round_trip');
    expect(res.body.itinerary.legs.map(l => l.direction)).toEqual(['outbound', 'outbound', 'return', 'return']);
    expect(res.body.itinerary.origin).toBe('BUD');
    expect(res.body.itinerary.destination).toBe('NCE');
    expect(res.body.itinerary.arrive_at).toBe(new Date('2030-06-20T16:30:00Z').toISOString());
    expect(StripeService.authorize).toHaveBeenCalledWith(
      expect.objectContaining({ amountEur: 15 + 62 + 70 + 14, description: expect.stringContaining('Round trip') })
    );
  });

  it('captures only the booked legs when the return flight fails at the provider', async () => {
    amadeus.book.mockImplementation(async ({ trip }) => {
      if (trip.id === 'amadeus:ret-1') throw new Error('Sold out');
      return okBooking();
    });

    const res = await request(app)
      .post('/book/itinerary')
      .set('Authorization', `Bearer ${token}`)
      .send(body([...OUT_LEGS, ...RETURN_LEGS]));

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('partially_failed');
    expect(res.body.failedLegs).toEqual([{ legOrder: 2, error: 'Sold out' }]);
    // Outbound 15 + 62 and the return bus 14 booked; the failed flight (70) is not charged.
    expect(StripeService.capture).toHaveBeenCalledWith('pi_test_123', 15 + 62 + 14);
  });

  it('rejects a return that departs before the outbound arrives (server offer times)', async () => {
    const early = { ...RETURN_LEGS[0], id: 'amadeus:ret-early', departAt: '2030-06-15T15:00:00Z', arriveAt: '2030-06-15T17:10:00Z' };
    offerStore.remember([early]);

    const res = await request(app)
      .post('/book/itinerary')
      .set('Authorization', `Bearer ${token}`)
      .send(body([...OUT_LEGS, early]));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Return must depart after the outbound arrives/);
    expect(StripeService.authorize).not.toHaveBeenCalled();
  });

  it('replays the same response for a repeated idempotency key', async () => {
    const payload = body([...OUT_LEGS, ...RETURN_LEGS], { idempotencyKey: `rt-idem-${Date.now()}` });
    const first = await request(app).post('/book/itinerary').set('Authorization', `Bearer ${token}`).send(payload);
    const second = await request(app).post('/book/itinerary').set('Authorization', `Bearer ${token}`).send(payload);

    expect(first.status).toBe(201);
    expect(second.body.bookingRef).toBe(first.body.bookingRef);
    expect(StripeService.authorize).toHaveBeenCalledTimes(1);
  });
});
