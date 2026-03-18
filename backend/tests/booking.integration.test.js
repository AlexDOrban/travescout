require('dotenv').config({ path: '.env.test' });

jest.mock('../src/services/stripe', () => ({
  getOrCreateCustomer: jest.fn().mockResolvedValue('cus_test_123'),
  charge: jest.fn().mockResolvedValue({ id: 'pi_test_123', status: 'succeeded' }),
}));

jest.mock('../src/providers/flixbus', () => ({
  search: jest.fn(),
  book: jest.fn().mockResolvedValue({ bookingRef: 'FB-INTTEST-001', status: 'confirmed', ticketUrl: null }),
}));

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

const app = createApp();

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
    expect(res.body.bookingRef).toBe('FB-INTTEST-001');
    expect(res.body.status).toBe('confirmed');
    expect(res.body.trip.id).toBeDefined();
    expect(res.body.trip.provider).toBe('flixbus');
    expect(parseFloat(res.body.trip.price_eur)).toBe(18);
  });

  it('persists the trip in the DB', async () => {
    const { userId, token } = await createTestUser('persist@booking.int.test');
    await request(app)
      .post('/book')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    const { rows } = await db.query('SELECT * FROM trips WHERE user_id = $1', [userId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].booking_ref).toBe('FB-INTTEST-001');
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
