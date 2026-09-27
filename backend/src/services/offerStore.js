// Server-side record of the offers we returned from search, so booking can
// re-quote the authoritative price instead of trusting the client's number.
// In-memory with a TTL; a multi-instance deployment would back this with Redis.

const TTL_MS = Number(process.env.OFFER_TTL_MS || 30 * 60 * 1000); // 30 min
const store = new Map(); // id -> { offer, expiresAt }

function prune(now) {
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) store.delete(id);
  }
}

// Record every normalized trip/leg we hand to the client.
function remember(trips, now = Date.now()) {
  prune(now);
  for (const t of trips) {
    if (!t || !t.id) continue;
    store.set(t.id, {
      offer: {
        id: t.id,
        provider: t.provider,
        origin: t.origin,
        destination: t.destination,
        departAt: t.departAt,
        arriveAt: t.arriveAt,
        priceEur: t.priceEur,
      },
      expiresAt: now + TTL_MS,
    });
  }
}

// Returns the stored offer if still valid, else null.
function get(id, now = Date.now()) {
  const entry = store.get(id);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    store.delete(id);
    return null;
  }
  return entry.offer;
}

// Test/maintenance helper.
function _clear() {
  store.clear();
}

module.exports = { remember, get, _clear, TTL_MS };
