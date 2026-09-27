require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db');

const app = createApp();
let refreshToken;

beforeAll(async () => {
  const res = await request(app).post('/auth/register')
    .send({ email: 'logout@example.com', password: 'password123' });
  refreshToken = res.body.refreshToken;
});

afterAll(async () => {
  await db.query('DELETE FROM refresh_tokens');
  await db.query('DELETE FROM users');
});

describe('POST /auth/logout', () => {
  it('returns 204 and invalidates the refresh token', async () => {
    const logoutRes = await request(app).post('/auth/logout').send({ refreshToken });
    expect(logoutRes.status).toBe(204);

    const refreshRes = await request(app).post('/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });

  it('returns 204 even with no token (idempotent)', async () => {
    const res = await request(app).post('/auth/logout').send({});
    expect(res.status).toBe(204);
  });
});
