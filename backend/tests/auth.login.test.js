require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db');

const app = createApp();

beforeAll(async () => {
  await request(app).post('/auth/register')
    .send({ email: 'login@example.com', password: 'correct_pass' });
});

afterAll(async () => {
  await db.query('DELETE FROM refresh_tokens');
  await db.query('DELETE FROM users');
});

describe('POST /auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    const res = await request(app).post('/auth/login')
      .send({ email: 'login@example.com', password: 'correct_pass' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/auth/login')
      .send({ email: 'login@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app).post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });
    expect(res.status).toBe(401);
  });
});
