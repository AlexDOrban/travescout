require('dotenv').config({ path: '.env.test' });

// Mock providers to return predictable results
jest.mock('../src/providers/flixbus', () => ({
  search: jest.fn().mockResolvedValue([
    { id: 'flix-1', departDate: '2030-06-15', departTime: '07:00', arriveTime: '09:30', price: 15, stops: 0 },
    { id: 'flix-2', departDate: '2030-06-15', departTime: '10:00', arriveTime: '12:30', price: 18, stops: 0 },
  ]),
  book: jest.fn(),
}));
jest.mock('../src/providers/rail', () => ({
  search: jest.fn().mockResolvedValue([
    { id: 'rail-1', departDate: '2030-06-15', departTime: '08:00', arriveTime: '10:45', price: 22, stops: 0 },
  ]),
  book: jest.fn(),
}));

const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db');

async function getAuthToken(app) {
  await request(app).post('/auth/register').send({
    email: 'conn-test@test.com', password: 'password123',
  });
  const res = await request(app).post('/auth/login').send({
    email: 'conn-test@test.com', password: 'password123',
  });
  return res.body.accessToken;
}

let app, token;

beforeAll(async () => {
  app = createApp();
  token = await getAuthToken(app);
});

afterAll(async () => {
  await db.query('DELETE FROM users');
});

describe('GET /search/connections', () => {
  it('returns connections for direction=to', async () => {
    const res = await request(app)
      .get('/search/connections')
      .query({
        hub: 'VIE-APT',
        cityCode: 'BUD',
        direction: 'to',
        dateTime: '2030-06-15T14:00:00Z',
        adults: 1,
      })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.connections).toBeInstanceOf(Array);
    res.body.connections.forEach(leg => {
      expect(leg).toHaveProperty('id');
      expect(leg).toHaveProperty('provider');
      expect(leg).toHaveProperty('transportType');
      expect(leg).toHaveProperty('originName');
      expect(leg).toHaveProperty('destinationName');
      expect(['bus', 'train']).toContain(leg.transportType);
    });
    expect(res.body.meta).toMatchObject({
      hub: 'VIE-APT',
      cityCode: 'BUD',
      direction: 'to',
    });
  });

  it('returns connections for direction=from', async () => {
    const res = await request(app)
      .get('/search/connections')
      .query({
        hub: 'NCE-APT',
        cityCode: 'NCE',
        direction: 'from',
        dateTime: '2030-06-15T16:10:00Z',
        adults: 1,
      })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.connections).toBeInstanceOf(Array);
  });

  it('returns 400 for missing params', async () => {
    const res = await request(app)
      .get('/search/connections')
      .query({ hub: 'VIE-APT' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid direction', async () => {
    const res = await request(app)
      .get('/search/connections')
      .query({
        hub: 'VIE-APT', cityCode: 'BUD', direction: 'invalid',
        dateTime: '2030-06-15T14:00:00Z', adults: 1,
      })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .get('/search/connections')
      .query({ hub: 'VIE-APT', cityCode: 'BUD', direction: 'to', dateTime: '2030-06-15T14:00:00Z', adults: 1 });

    expect(res.status).toBe(401);
  });
});
