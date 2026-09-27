const db = require('../db');

// Server-side idempotency ledger. A single row per (idempotency key) records
// whether a booking attempt is in flight or completed, plus the stored
// response so a retried request replays the original result instead of
// charging or booking again.

// Claim a key. Returns:
//   { claimed: true }                       — first time; caller proceeds
//   { claimed: false, row }                 — key already exists (row has status/response/user_id)
async function claim(idempotencyKey, userId) {
  const { rows } = await db.query(
    `INSERT INTO booking_attempts (idempotency_key, user_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING *`,
    [idempotencyKey, userId]
  );
  if (rows[0]) return { claimed: true };
  const existing = await db.query(
    'SELECT * FROM booking_attempts WHERE idempotency_key = $1',
    [idempotencyKey]
  );
  return { claimed: false, row: existing.rows[0] };
}

async function complete(idempotencyKey, response) {
  await db.query(
    `UPDATE booking_attempts SET status = 'completed', response = $2 WHERE idempotency_key = $1`,
    [idempotencyKey, response]
  );
}

// Remove a failed attempt so the user can genuinely retry.
async function release(idempotencyKey) {
  await db.query('DELETE FROM booking_attempts WHERE idempotency_key = $1', [idempotencyKey]);
}

module.exports = { claim, complete, release };
