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
