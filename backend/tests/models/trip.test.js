require('dotenv').config({ path: '.env.test' });

const db = require('../../src/db');
const Trip = require('../../src/models/trip');

let testUserId;

beforeAll(async () => {
  const { rows } = await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
    ['trip-model@test.com', '$2b$12$placeholder']
  );
  testUserId = rows[0].id;
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE email = $1', ['trip-model@test.com']);
});

afterEach(async () => {
  await db.query('DELETE FROM trips WHERE user_id = $1', [testUserId]);
});

const tripData = () => ({
  userId: testUserId,
  provider: 'flixbus',
  bookingRef: 'FB-TEST-001',
  origin: 'LON',
  destination: 'PAR',
  departAt: '2026-04-15T06:30:00Z',
  returnAt: null,
  priceEur: 18,
  currencyDisplay: 'EUR',
  status: 'confirmed',
  rawTicketUrl: null,
});

describe('Trip model', () => {
  it('creates a trip and returns the row', async () => {
    const trip = await Trip.create(tripData());
    expect(trip.id).toBeDefined();
    expect(trip.booking_ref).toBe('FB-TEST-001');
    expect(trip.provider).toBe('flixbus');
    expect(trip.status).toBe('confirmed');
  });

  it('findByUserId returns trips for that user ordered newest first', async () => {
    await Trip.create(tripData());
    await Trip.create({ ...tripData(), bookingRef: 'FB-TEST-002', departAt: '2026-05-01T06:30:00Z' });
    const trips = await Trip.findByUserId(testUserId);
    expect(trips).toHaveLength(2);
    // newest first (created_at DESC)
    expect(trips[0].booking_ref).toBe('FB-TEST-002');
  });

  it('findByUserId returns empty array if user has no trips', async () => {
    const trips = await Trip.findByUserId(testUserId);
    expect(trips).toEqual([]);
  });

  it('findByUserId does not return trips belonging to other users', async () => {
    const { rows } = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      ['other@test.com', '$2b$12$placeholder']
    );
    const otherId = rows[0].id;
    await Trip.create({ ...tripData(), userId: otherId, bookingRef: 'FB-OTHER-001' });
    const trips = await Trip.findByUserId(testUserId);
    expect(trips).toHaveLength(0);
    await db.query('DELETE FROM users WHERE id = $1', [otherId]);
  });
});
