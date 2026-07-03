require('dotenv').config({ path: '.env.test' });

jest.mock('../src/services/stripe', () => ({
  getOrCreateCustomer: jest.fn().mockResolvedValue('cus_test_123'),
  authorize: jest.fn().mockResolvedValue({ id: 'pi_test_123', status: 'requires_capture' }),
  capture: jest.fn().mockResolvedValue({ id: 'pi_test_123', status: 'succeeded' }),
  cancel: jest.fn().mockResolvedValue({ id: 'pi_test_123', status: 'canceled' }),
}));

jest.mock('../src/providers/flixbus', () => {
  let n = 0;
  return {
    search: jest.fn(),
    // Unique ref per call — refs are now UNIQUE in the DB.
    book: jest.fn().mockImplementation(async () => ({
      bookingRef: `FB-INTTEST-${++n}`,
      status: 'confirmed',
      ticketUrl: null,
    })),
  };
});

jest.mock('../src/providers/rail', () => ({
  search: jest.fn(),
  book: jest.fn().mockResolvedValue({ bookingRef: 'TL-INTTEST-001', status: 'confirmed', ticketUrl: null }),
}));

jest.mock('../src/providers/amadeus', () => ({
  search: jest.fn(),
  book: jest.fn().mockResolvedValue({ bookingRef: 'AM-INTTEST-001', status: 'confirmed', ticketUrl: null }),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../src/app');
const db = require('../src/db');
const offerStore = require('../src/services/offerStore');

const app = createApp();

const OFFER_ID = 'flixbus:int-1';

// Seed the authoritative offer the booking re-quotes against (normally done by
// a prior /search). Prices/times here are the ones actually charged/stored.
beforeEach(() => {
  offerStore.remember([{
    id: OFFER_ID,
    provider: 'flixbus',
    origin: 'LON',
    destination: 'PAR',
    departAt: '2026-04-15T06:30:00Z',
    arriveAt: '2026-04-15T11:00:00Z',
    priceEur: 18,
  }]);
});

async function createTestUser(email) {
  const { rows } = await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
    [email, '$2b$12$placeholder']
  );
  const userId = rows[0].id;
  const token = jwt.sign(
    { sub: userId },
    process.env.JWT_ACCESS_SECRET || 'test_access_secret',
    { expiresIn: '1h' }
  );
  return { userId, token };
}

afterAll(async () => {
  await db.query("DELETE FROM users WHERE email LIKE '%@booking.int.test'");
});

const validBody = {
  trip: {
    id: OFFER_ID,
    provider: 'flixbus',
    origin: 'LON',
    destination: 'PAR',
    departAt: '2026-04-15T06:30:00Z',
    priceEur: 18,
  },
  passengers: [{ name: 'John Doe', email: 'john@example.com' }],
  paymentMethodId: 'pm_card_visa',
};

describe('POST /book', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/book').send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 400 if trip is missing', async () => {
    const { token } = await createTestUser('no-trip@booking.int.test');
    const res = await request(app)
      .post('/book')
      .set('Authorization', `Bearer ${token}`)
      .send({ passengers: validBody.passengers, paymentMethodId: validBody.paymentMethodId });
    expect(res.status).toBe(400);
  });

  it('returns 400 if passengers is empty', async () => {
    const { token } = await createTestUser('empty-pax@booking.int.test');
    const res = await request(app)
      .post('/book')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validBody, passengers: [] });
    expect(res.status).toBe(400);
  });

  it('returns 400 if paymentMethodId is missing', async () => {
    const { token } = await createTestUser('no-pm@booking.int.test');
    const res = await request(app)
      .post('/book')
      .set('Authorization', `Bearer ${token}`)
      .send({ trip: validBody.trip, passengers: validBody.passengers });
    expect(res.status).toBe(400);
  });

  it('returns 201 with bookingRef and trip on success', async () => {
    const { token } = await createTestUser('happy@booking.int.test');
    const res = await request(app)
      .post('/book')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.bookingRef).toMatch(/^FB-INTTEST-/);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.trip.id).toBeDefined();
    expect(res.body.trip.provider).toBe('flixbus');
    expect(parseFloat(res.body.trip.price_eur)).toBe(18);
  });

  it('charges the authoritative offer price, not a tampered client price', async () => {
    const { userId, token } = await createTestUser('tamper@booking.int.test');
    const res = await request(app)
      .post('/book')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validBody, trip: { ...validBody.trip, priceEur: 0.01 } });
    expect(res.status).toBe(201);
    const { rows } = await db.query('SELECT price_eur FROM trips WHERE user_id = $1', [userId]);
    expect(parseFloat(rows[0].price_eur)).toBe(18);
  });

  it('returns 409 when the offer is no longer available (stale checkout)', async () => {
    offerStore._clear();
    const { token } = await createTestUser('stale@booking.int.test');
    const res = await request(app)
      .post('/book')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).toBe(409);
  });

  it('persists the trip in the DB', async () => {
    const { userId, token } = await createTestUser('persist@booking.int.test');
    await request(app)
      .post('/book')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    const { rows } = await db.query('SELECT * FROM trips WHERE user_id = $1', [userId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].booking_ref).toMatch(/^FB-INTTEST-/);
  });

  it('replays the same result for a repeated idempotency key (no double booking)', async () => {
    const { userId, token } = await createTestUser('idem@booking.int.test');
    const key = 'idem-key-abc';
    const first = await request(app)
      .post('/book')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send(validBody);
    const second = await request(app)
      .post('/book')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send(validBody);
    expect(first.status).toBe(201);
    expect(second.body.bookingRef).toBe(first.body.bookingRef);
    const { rows } = await db.query('SELECT * FROM trips WHERE user_id = $1', [userId]);
    expect(rows).toHaveLength(1); // booked exactly once
  });

  it('returns 400 for unknown provider', async () => {
    const { token } = await createTestUser('bad-prov@booking.int.test');
    const res = await request(app)
      .post('/book')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validBody, trip: { ...validBody.trip, provider: 'unknown' } });
    expect(res.status).toBe(400);
  });
});
