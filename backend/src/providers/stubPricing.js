// Stub providers only: deterministic per-date fare variation so the date strip
// and price alerts show realistic movement instead of the same price every day.
// Fridays/Sundays cost more, plus a stable ±12% jitter derived from the date.
function stubDateFactor(departDate) {
  const dow = new Date(`${departDate}T00:00:00Z`).getUTCDay();
  const weekday = dow === 5 || dow === 0 ? 1.2 : dow === 6 ? 1.05 : 1;
  let h = 7;
  for (const ch of departDate) h = (h * 131 + ch.charCodeAt(0)) % 10007;
  const jitter = 0.88 + (h % 25) / 100; // 0.88–1.12
  return weekday * jitter;
}

function stubFare(baseEur, departDate) {
  return Math.max(1, Math.round(baseEur * stubDateFactor(departDate)));
}

module.exports = { stubDateFactor, stubFare };
