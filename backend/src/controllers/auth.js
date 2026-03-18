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
