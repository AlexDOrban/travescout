const db = require('../db');

async function create(data) {
  const { rows } = await db.query(
    `INSERT INTO trips
       (user_id, provider, booking_ref, origin, destination,
        depart_at, return_at, price_eur, currency_display, status, raw_ticket_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      data.userId,
      data.provider,
      data.bookingRef,
      data.origin,
      data.destination,
      data.departAt,
      data.returnAt || null,
      data.priceEur,
      data.currencyDisplay || 'EUR',
      data.status || 'confirmed',
      data.rawTicketUrl || null,
    ]
  );
  return rows[0];
}

async function findByUserId(userId) {
  const { rows } = await db.query(
    'SELECT * FROM trips WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

module.exports = { create, findByUserId };
