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

async function findById(id) {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function setStripeCustomerId(id, stripeCustomerId) {
  await db.query(
    'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
    [stripeCustomerId, id]
  );
}

module.exports = { findByEmail, create, findById, setStripeCustomerId };
