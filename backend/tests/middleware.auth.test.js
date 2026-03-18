require('dotenv').config();
const request = require('supertest');
const express = require('express');
const requireAuth = require('../src/middleware/auth');

function makeApp(handler) {
  const app = express();
  app.use(express.json());
  app.get('/protected', requireAuth, handler);
  return app;
}

describe('requireAuth middleware', () => {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_ACCESS_SECRET || 'test_secret';
  const validToken = jwt.sign({ sub: 'user-123' }, secret, { expiresIn: '1m' });

  it('rejects requests with no token', async () => {
    const app = makeApp((_req, res) => res.json({ ok: true }));
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  it('rejects requests with invalid token', async () => {
    const app = makeApp((_req, res) => res.json({ ok: true }));
    const res = await request(app).get('/protected')
      .set('Authorization', 'Bearer bad_token');
    expect(res.status).toBe(401);
  });

  it('allows requests with valid token and sets req.userId', async () => {
    const app = makeApp((req, res) => res.json({ userId: req.userId }));
    const res = await request(app).get('/protected')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-123');
  });
});
