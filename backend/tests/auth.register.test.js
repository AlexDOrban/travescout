require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db');

afterEach(async () => {
  await db.query('DELETE FROM refresh_tokens');
  await db.query('DELETE FROM users');
});

describe('POST /auth/register', () => {
  const app = createApp();

  it('registers a new user and returns tokens', async () => {
    const res = await request(app).post('/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('rejects duplicate email with 409', async () => {
    await request(app).post('/auth/register')
      .send({ email: 'dupe@example.com', password: 'password123' });
    const res = await request(app).post('/auth/register')
      .send({ email: 'dupe@example.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('rejects missing fields with 400', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });
});
