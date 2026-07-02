const AuthService = require('../services/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function validateCredentials(email, password, { enforceStrength = false } = {}) {
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return 'email and password are required';
  }
  if (!EMAIL_RE.test(email)) {
    return 'email is not a valid email address';
  }
  if (enforceStrength && password.length < MIN_PASSWORD_LENGTH) {
    return `password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    const invalid = validateCredentials(email, password, { enforceStrength: true });
    if (invalid) {
      return res.status(400).json({ error: invalid });
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
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
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
    if (typeof refreshToken !== 'string' || !refreshToken) {
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
    if (refreshToken && typeof refreshToken === 'string') await AuthService.logout(refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout };
