require('dotenv').config({ path: '.env.test' });

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
  await db.query("DELETE FROM users WHERE email LIKE '%@trips.int.test'");
});

describe('GET /trips', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/trips');
    expect(res.status).toBe(401);
  });

  it('returns empty trips array for a user with no bookings', async () => {
    const { token } = await createTestUser('empty@trips.int.test');
    const res = await request(app)
      .get('/trips')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.trips).toEqual([]);
  });

  it('returns trips belonging to the authenticated user', async () => {
    const { userId, token } = await createTestUser('has-trips@trips.int.test');
    await db.query(
      `INSERT INTO trips (user_id, provider, booking_ref, origin, destination, depart_at, price_eur, status)
       VALUES ($1, 'rail', 'TL-TRIPTEST-001', 'LON', 'AMS', '2026-05-01T09:00:00Z', 39.00, 'confirmed')`,
      [userId]
    );
    const res = await request(app)
      .get('/trips')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.trips).toHaveLength(1);
    expect(res.body.trips[0].booking_ref).toBe('TL-TRIPTEST-001');
    expect(res.body.trips[0].provider).toBe('rail');
  });

  it('does not return trips belonging to another user', async () => {
    const { userId: user1Id } = await createTestUser('user1@trips.int.test');
    const { token: user2Token } = await createTestUser('user2@trips.int.test');
    await db.query(
      `INSERT INTO trips (user_id, provider, booking_ref, origin, destination, depart_at, price_eur, status)
       VALUES ($1, 'amadeus', 'AM-PRIVATE-001', 'LHR', 'CDG', '2026-06-01T08:00:00Z', 54.00, 'confirmed')`,
      [user1Id]
    );
    const res = await request(app)
      .get('/trips')
      .set('Authorization', `Bearer ${user2Token}`);
    expect(res.status).toBe(200);
    expect(res.body.trips).toHaveLength(0);
  });

  it('returns multiple trips sorted newest first', async () => {
    const { userId, token } = await createTestUser('multi@trips.int.test');
    await db.query(
      `INSERT INTO trips (user_id, provider, booking_ref, origin, destination, depart_at, price_eur, status)
       VALUES ($1, 'flixbus', 'FB-MULTI-001', 'LON', 'PAR', '2026-04-15T06:30:00Z', 18.00, 'confirmed')`,
      [userId]
    );
    // Small delay to ensure distinct created_at timestamps for ordering
    await db.query('SELECT pg_sleep(0.01)');
    await db.query(
      `INSERT INTO trips (user_id, provider, booking_ref, origin, destination, depart_at, price_eur, status)
       VALUES ($1, 'rail', 'TL-MULTI-002', 'LON', 'AMS', '2026-05-10T09:00:00Z', 39.00, 'confirmed')`,
      [userId]
    );
    const res = await request(app)
      .get('/trips')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.trips).toHaveLength(2);
    // newest created_at first
    expect(res.body.trips[0].booking_ref).toBe('TL-MULTI-002');
  });
});
