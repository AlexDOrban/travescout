const db = require('../db');

async function create({ userId, bookingRef, origin, destination, departAt, arriveAt, totalPriceEur, status }) {
  const result = await db.query(
    `INSERT INTO itineraries (user_id, booking_ref, origin, destination, depart_at, arrive_at, total_price_eur, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, bookingRef, origin, destination, departAt, arriveAt, totalPriceEur, status]
  );
  return result.rows[0];
}

async function findByUserId(userId) {
  const result = await db.query(
    `SELECT i.*,
       COALESCE(json_agg(
         json_build_object(
           'id', t.id,
           'provider', t.provider,
           'booking_ref', t.booking_ref,
           'origin', t.origin,
           'destination', t.destination,
           'depart_at', t.depart_at,
           'return_at', t.return_at,
           'price_eur', t.price_eur,
           'currency_display', t.currency_display,
           'status', t.status,
           'raw_ticket_url', t.raw_ticket_url,
           'ticket_qr_data', t.ticket_qr_data,
           'leg_order', t.leg_order,
           'itinerary_id', t.itinerary_id,
           'created_at', t.created_at
         ) ORDER BY t.leg_order
       ) FILTER (WHERE t.id IS NOT NULL), '[]') AS legs
     FROM itineraries i
     LEFT JOIN trips t ON t.itinerary_id = i.id
     WHERE i.user_id = $1
     GROUP BY i.id
     ORDER BY i.created_at DESC`,
    [userId]
  );
  return result.rows;
}

module.exports = { create, findByUserId };
