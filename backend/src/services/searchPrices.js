const { fanOut } = require('../providers/index');

// Cheapest fare per day powers the date strip on the results screen. Each day
// is a full provider fan-out, so cache per route/day/party to keep the paid
// Amadeus API from being hammered as users flick between dates.
const TTL_MS = 10 * 60 * 1000;
const cache = new Map();

function addDaysISO(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}

async function minPriceFor(params, date) {
  const key = `${params.from}|${params.to}|${params.adults}|${date}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const { trips, providersFailed } = await fanOut({
    from: params.from,
    to: params.to,
    departDate: date,
    returnDate: null,
    adults: params.adults,
  });
  const prices = trips.map(t => t.priceEur).filter(Number.isFinite);
  const value = prices.length ? Math.min(...prices) : null;

  // Don't pin a total outage in the cache; the next request should retry.
  const allFailed = providersFailed.length > 0 && trips.length === 0;
  if (!allFailed) cache.set(key, { value, expires: Date.now() + TTL_MS });
  return value;
}

async function pricesByDay(params) {
  const dates = Array.from({ length: params.days }, (_, i) => addDaysISO(params.startDate, i));
  const values = await Promise.all(dates.map(date => minPriceFor(params, date)));
  return dates.map((date, i) => ({ date, minPriceEur: values[i] }));
}

function clearPriceCache() {
  cache.clear();
}

module.exports = { pricesByDay, clearPriceCache };
