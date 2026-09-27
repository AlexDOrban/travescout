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

// Atomic check-and-consume: two concurrent refreshes with the same token
// cannot both pass a separate find-then-remove.
async function consume(token) {
  const { rows } = await db.query(
    'DELETE FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW() RETURNING *',
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

module.exports = { save, findValid, consume, remove, removeAllForUser };
