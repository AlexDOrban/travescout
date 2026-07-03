const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const RefreshToken = require('../models/refreshToken');

const BCRYPT_ROUNDS = 12;

const REFRESH_TOKEN_TTL_MS = (() => {
  const val = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const match = val.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return n * unit;
})();

function makeAccessToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
}

function makeRefreshToken(userId) {
  return jwt.sign(
    { sub: userId, jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

// Emails are case-insensitive; store and match on the normalized form so
// John@x.com and john@x.com are the same account.
function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

async function register(email, password) {
  email = normalizeEmail(email);
  const existing = await User.findByEmail(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  let user;
  try {
    user = await User.create(email, hash);
  } catch (e) {
    // Concurrent registration can pass findByEmail and hit the unique constraint.
    if (e.code === '23505') {
      const err = new Error('Email already registered');
      err.status = 409;
      throw err;
    }
    throw e;
  }
  const accessToken = makeAccessToken(user.id);
  const refreshToken = makeRefreshToken(user.id);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await RefreshToken.save(user.id, refreshToken, expiresAt);
  return { user, accessToken, refreshToken };
}

async function login(email, password) {
  email = normalizeEmail(email);
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
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
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
  const stored = await RefreshToken.consume(token);
  if (!stored) {
    const err = new Error('Refresh token not found or expired');
    err.status = 401;
    throw err;
  }
  const newRefresh = makeRefreshToken(payload.sub);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await RefreshToken.save(payload.sub, newRefresh, expiresAt);
  const accessToken = makeAccessToken(payload.sub);
  return { accessToken, refreshToken: newRefresh };
}

async function logout(token) {
  await RefreshToken.remove(token);
}

// Revoke every refresh token for a user ("log out everywhere").
async function logoutAll(userId) {
  await RefreshToken.removeAllForUser(userId);
}

module.exports = { register, login, refresh, logout, logoutAll };
