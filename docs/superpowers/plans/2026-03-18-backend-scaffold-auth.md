# TraveScout Backend — Scaffold + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a production-ready Node.js/Express API with PostgreSQL, JWT authentication (register, login, refresh, logout), and a health check endpoint — the foundation all other backend plans build on.

**Architecture:** Express app with a layered structure (routes → controllers → services → db). PostgreSQL via `pg` (node-postgres). JWT auth using short-lived access tokens (15m) + long-lived refresh tokens (7d) stored in the DB. Passwords hashed with bcrypt.

**Tech Stack:** Node.js 20+ · Express 4 · PostgreSQL 15 · pg · bcrypt · jsonwebtoken · dotenv · Jest + Supertest

---

## File Map

```
backend/
  package.json
  .env.example
  jest.config.js
  src/
    index.js              # App entry — binds server to port
    app.js                # Express app factory (no listen) — used by tests
    db.js                 # pg Pool singleton
    middleware/
      auth.js             # requireAuth middleware — validates access JWT
      errorHandler.js     # Global error handler
    routes/
      health.js           # GET /health
      auth.js             # POST /auth/register, /auth/login, /auth/refresh, /auth/logout
    controllers/
      auth.js             # Request/response handling for auth routes
    services/
      auth.js             # Business logic: register, login, refresh, logout
    models/
      user.js             # DB queries for users table
      refreshToken.js     # DB queries for refresh_tokens table
  tests/
    health.test.js
    auth.register.test.js
    auth.login.test.js
    auth.refresh.test.js
    auth.logout.test.js
    middleware.auth.test.js
  migrations/
    001_create_users.sql
    002_create_refresh_tokens.sql
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `backend/package.json`
- Create: `backend/.env.example`
- Create: `backend/jest.config.js`
- Create: `backend/src/app.js`
- Create: `backend/src/index.js`

- [ ] **Step 1: Create the backend directory and initialise npm**

```bash
cd "/Users/alexorban/Downloads/Claude projects/best trave transport price"
mkdir backend && cd backend
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install express pg bcrypt jsonwebtoken dotenv
npm install --save-dev jest supertest
```

- [ ] **Step 3: Create `.env.example`**

```
DATABASE_URL=postgres://postgres:password@localhost:5432/travescout
JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
```

Copy to `.env` and fill in real values (never commit `.env`).

- [ ] **Step 4: Create `jest.config.js`**

```js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
};
```

- [ ] **Step 5: Add scripts to `package.json`**

In the `"scripts"` section:

```json
"start": "node src/index.js",
"dev": "node --watch src/index.js",
"test": "jest --runInBand"
```

- [ ] **Step 6: Create `src/app.js`**

```js
const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
```

- [ ] **Step 7: Create `src/index.js`**

```js
require('dotenv').config();
const createApp = require('./app');

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`TraveScout API listening on port ${PORT}`);
});
```

- [ ] **Step 8: Commit**

```bash
cd "/Users/alexorban/Downloads/Claude projects/best trave transport price"
git add backend/
git commit -m "feat: scaffold backend Node.js/Express project"
```

---

## Task 2: Database Setup

**Files:**
- Create: `backend/src/db.js`
- Create: `backend/migrations/001_create_users.sql`
- Create: `backend/migrations/002_create_refresh_tokens.sql`

- [ ] **Step 1: Ensure PostgreSQL is running and create the database**

```bash
psql -U postgres -c "CREATE DATABASE travescout;"
```

- [ ] **Step 2: Create `migrations/001_create_users.sql`**

```sql
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 3: Create `migrations/002_create_refresh_tokens.sql`**

```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON refresh_tokens(user_id);
```

- [ ] **Step 4: Run migrations**

```bash
psql "$DATABASE_URL" -f migrations/001_create_users.sql
psql "$DATABASE_URL" -f migrations/002_create_refresh_tokens.sql
```

Expected: `CREATE TABLE` output for each.

- [ ] **Step 5: Create `src/db.js`**

```js
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = {
  query: (text, params) => pool.query(text, params),
};
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/db.js backend/migrations/
git commit -m "feat: add PostgreSQL connection pool and schema migrations"
```

---

## Task 3: Health Check

**Files:**
- Create: `backend/src/routes/health.js`
- Create: `backend/tests/health.test.js`

- [ ] **Step 1: Write the failing test**

`tests/health.test.js`:

```js
const request = require('supertest');
const createApp = require('../src/app');

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd backend && npm test -- tests/health.test.js
```

Expected: FAIL — `Cannot find module './routes/health'`

- [ ] **Step 3: Create `src/routes/health.js`**

```js
const { Router } = require('express');
const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- tests/health.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/health.js backend/tests/health.test.js
git commit -m "feat: add /health endpoint"
```

---

## Task 4: Error Handler Middleware

**Files:**
- Create: `backend/src/middleware/errorHandler.js`

- [ ] **Step 1: Create `src/middleware/errorHandler.js`**

```js
function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/middleware/errorHandler.js
git commit -m "feat: add global error handler middleware"
```

---

## Task 5: User Model

**Files:**
- Create: `backend/src/models/user.js`

- [ ] **Step 1: Create `src/models/user.js`**

```js
const db = require('../db');

async function findByEmail(email) {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

async function create(email, passwordHash) {
  const { rows } = await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [email, passwordHash]
  );
  return rows[0];
}

module.exports = { findByEmail, create };
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/models/user.js
git commit -m "feat: add user model (findByEmail, create)"
```

---

## Task 6: Refresh Token Model

**Files:**
- Create: `backend/src/models/refreshToken.js`

- [ ] **Step 1: Create `src/models/refreshToken.js`**

```js
const db = require('../db');
const crypto = require('crypto');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function save(userId, token, expiresAt) {
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hashToken(token), expiresAt]
  );
}

async function findValid(token) {
  const { rows } = await db.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()',
    [hashToken(token)]
  );
  return rows[0] || null;
}

async function remove(token) {
  await db.query(
    'DELETE FROM refresh_tokens WHERE token_hash = $1',
    [hashToken(token)]
  );
}

async function removeAllForUser(userId) {
  await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

module.exports = { save, findValid, remove, removeAllForUser };
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/models/refreshToken.js
git commit -m "feat: add refresh token model"
```

---

## Task 7: Auth Service

**Files:**
- Create: `backend/src/services/auth.js`

- [ ] **Step 1: Create `src/services/auth.js`**

```js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const RefreshToken = require('../models/refreshToken');

const BCRYPT_ROUNDS = 12;

function makeAccessToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
}

function makeRefreshToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

async function register(email, password) {
  const existing = await User.findByEmail(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create(email, hash);
  const accessToken = makeAccessToken(user.id);
  const refreshToken = makeRefreshToken(user.id);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.save(user.id, refreshToken, expiresAt);
  return { user, accessToken, refreshToken };
}

async function login(email, password) {
  const user = await User.findByEmail(email);
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const accessToken = makeAccessToken(user.id);
  const refreshToken = makeRefreshToken(user.id);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.save(user.id, refreshToken, expiresAt);
  return { user, accessToken, refreshToken };
}

async function refresh(token) {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    const err = new Error('Invalid refresh token');
    err.status = 401;
    throw err;
  }
  const stored = await RefreshToken.findValid(token);
  if (!stored) {
    const err = new Error('Refresh token not found or expired');
    err.status = 401;
    throw err;
  }
  await RefreshToken.remove(token);
  const newRefresh = makeRefreshToken(payload.sub);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.save(payload.sub, newRefresh, expiresAt);
  const accessToken = makeAccessToken(payload.sub);
  return { accessToken, refreshToken: newRefresh };
}

async function logout(token) {
  await RefreshToken.remove(token);
}

module.exports = { register, login, refresh, logout };
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/auth.js
git commit -m "feat: add auth service (register, login, refresh, logout)"
```

---

## Task 8: Auth Controller + Routes

**Files:**
- Create: `backend/src/controllers/auth.js`
- Create: `backend/src/routes/auth.js`

- [ ] **Step 1: Create `src/controllers/auth.js`**

```js
const AuthService = require('../services/auth');

async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const { user, accessToken, refreshToken } = await AuthService.register(email, password);
    res.status(201).json({ user: { id: user.id, email: user.email }, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const { user, accessToken, refreshToken } = await AuthService.login(email, password);
    res.json({ user: { id: user.id, email: user.email }, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }
    const tokens = await AuthService.refresh(refreshToken);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await AuthService.logout(refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout };
```

- [ ] **Step 2: Create `src/routes/auth.js`**

```js
const { Router } = require('express');
const controller = require('../controllers/auth');

const router = Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/auth.js backend/src/routes/auth.js
git commit -m "feat: add auth controller and routes"
```

---

## Task 9: Auth Middleware

**Files:**
- Create: `backend/src/middleware/auth.js`
- Create: `backend/tests/middleware.auth.test.js`

- [ ] **Step 1: Write the failing test**

`tests/middleware.auth.test.js`:

```js
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
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- tests/middleware.auth.test.js
```

Expected: FAIL — `Cannot find module '../src/middleware/auth'`

- [ ] **Step 3: Create `src/middleware/auth.js`**

```js
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

module.exports = requireAuth;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/middleware.auth.test.js
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/auth.js backend/tests/middleware.auth.test.js
git commit -m "feat: add requireAuth middleware"
```

---

## Task 10: Auth Integration Tests

**Files:**
- Create: `backend/tests/auth.register.test.js`
- Create: `backend/tests/auth.login.test.js`
- Create: `backend/tests/auth.refresh.test.js`
- Create: `backend/tests/auth.logout.test.js`

> These tests hit a real test database. Set `DATABASE_URL` to point at a `travescout_test` DB. Run migrations against it before running tests.

```bash
psql -U postgres -c "CREATE DATABASE travescout_test;"
DATABASE_URL=postgres://postgres:password@localhost:5432/travescout_test \
  psql "$DATABASE_URL" -f migrations/001_create_users.sql \
  -f migrations/002_create_refresh_tokens.sql
```

- [ ] **Step 1: Write `tests/auth.register.test.js`**

```js
require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db');

afterEach(async () => {
  await db.query('DELETE FROM refresh_tokens');
  await db.query('DELETE FROM users');
});

afterAll(async () => {
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
      .send({ email: 'dupe@example.com', password: 'pass' });
    const res = await request(app).post('/auth/register')
      .send({ email: 'dupe@example.com', password: 'pass' });
    expect(res.status).toBe(409);
  });

  it('rejects missing fields with 400', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Write `tests/auth.login.test.js`**

```js
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
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/auth/login')
      .send({ email: 'login@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app).post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'pass' });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 3: Write `tests/auth.refresh.test.js`**

```js
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
```

- [ ] **Step 4: Write `tests/auth.logout.test.js`**

```js
require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db');

const app = createApp();
let refreshToken;

beforeAll(async () => {
  const res = await request(app).post('/auth/register')
    .send({ email: 'logout@example.com', password: 'pass' });
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
```

- [ ] **Step 5: Create `.env.test` locally (do NOT commit)**

```
DATABASE_URL=postgres://postgres:password@localhost:5432/travescout_test
JWT_ACCESS_SECRET=test_access_secret
JWT_REFRESH_SECRET=test_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

Add `.env.test` to `.gitignore`:

```bash
echo ".env.test" >> backend/.gitignore
echo ".env" >> backend/.gitignore
```

- [ ] **Step 6: Run all auth tests**

```bash
npm test
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add backend/tests/ backend/.gitignore
git commit -m "test: add integration tests for auth endpoints"
```

---

## Task 11: Final Smoke Test

- [ ] **Step 1: Start the server**

```bash
cd backend && npm run dev
```

Expected: `TraveScout API listening on port 3000`

- [ ] **Step 2: Run smoke tests with curl**

```bash
# Health
curl http://localhost:3000/health

# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"test1234"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"test1234"}'
```

Expected: valid JSON responses with tokens.

- [ ] **Step 3: Final commit**

```bash
git commit --allow-empty -m "chore: backend scaffold + auth complete — ready for Plan 2 (Search API)"
```

---

## Next Plan

**Plan 2:** Search API — fan-out to Amadeus, FlixBus, and Rail APIs; response normalisation; smart ranking.
