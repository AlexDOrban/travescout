require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db');

const app = createApp();

afterAll(async () => {
  await db.query('DELETE FROM refresh_tokens');
  await db.query('DELETE FROM users');
});

async function mintRefreshToken() {
  const email = `refresh-${Date.now()}@example.com`;
  const res = await request(app).post('/auth/register').send({ email, password: 'password123' });
  return res.body.refreshToken;
}

describe('POST /auth/refresh', () => {
  it('returns new tokens for valid refresh token', async () => {
    const refreshToken = await mintRefreshToken();
    const res = await request(app).post('/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('rejects the same refresh token after it has been rotated', async () => {
    const refreshToken = await mintRefreshToken();
    const firstUse = await request(app).post('/auth/refresh').send({ refreshToken });
    expect(firstUse.status).toBe(200);
    // The original token is now invalidated — reusing it must be rejected
    const secondUse = await request(app).post('/auth/refresh').send({ refreshToken });
    expect(secondUse.status).toBe(401);
  });

  it('rejects missing token with 400', async () => {
    const res = await request(app).post('/auth/refresh').send({});
    expect(res.status).toBe(400);
  });
});
