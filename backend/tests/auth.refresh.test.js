require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db');

const app = createApp();
let refreshToken;

beforeAll(async () => {
  const res = await request(app).post('/auth/register')
    .send({ email: 'refresh@example.com', password: 'pass' });
  refreshToken = res.body.refreshToken;
});

afterAll(async () => {
  await db.query('DELETE FROM refresh_tokens');
  await db.query('DELETE FROM users');
});

describe('POST /auth/refresh', () => {
  it('returns new tokens for valid refresh token', async () => {
    const res = await request(app).post('/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    refreshToken = res.body.refreshToken; // rotate
  });

  it('rejects the same refresh token after it has been rotated', async () => {
    // Use the token once — server should rotate it and invalidate the original
    const firstUse = await request(app).post('/auth/refresh').send({ refreshToken });
    expect(firstUse.status).toBe(200);
    // Re-using the original (now invalidated) token must be rejected
    const secondUse = await request(app).post('/auth/refresh').send({ refreshToken });
    expect(secondUse.status).toBe(401);
    refreshToken = firstUse.body.refreshToken; // keep rotating
  });

  it('rejects missing token with 400', async () => {
    const res = await request(app).post('/auth/refresh').send({});
    expect(res.status).toBe(400);
  });
});
