const db = require('../db');

// executor defaults to the pool; pass a transaction executor to enrol the
// insert in a surrounding transaction (see db.withTransaction).
async function create(data, executor = db) {
  const { rows } = await executor.query(
    `INSERT INTO trips
       (user_id, provider, booking_ref, origin, destination,
        depart_at, arrive_at, return_at, price_eur, currency_display, status, raw_ticket_url,
        itinerary_id, leg_order, ticket_qr_data, direction)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      data.userId,
      data.provider,
      data.bookingRef,
      data.origin,
      data.destination,
      data.departAt,
      data.arriveAt || null,
      data.returnAt || null,
      data.priceEur,
      data.currencyDisplay || 'EUR',
      data.status || 'confirmed',
      data.rawTicketUrl || null,
      data.itineraryId || null,
      data.legOrder || 0,
      data.ticketQrData || null,
      data.direction || 'outbound',
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

async function findStandaloneByUserId(userId) {
  const result = await db.query(
    'SELECT * FROM trips WHERE user_id = $1 AND itinerary_id IS NULL ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

module.exports = { create, findByUserId, findStandaloneByUserId };
