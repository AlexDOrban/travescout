const { parseSearchParams } = require('./search');

const MAX_DAYS = 14;

function parseSearchPricesParams(query) {
  const { startDate, days, ...rest } = query;
  // Reuse the search validator for from/to/date/adults.
  const base = parseSearchParams({ ...rest, departDate: startDate });

  const parsedDays = days === undefined ? 7 : parseInt(days, 10);
  if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > MAX_DAYS) {
    throw Object.assign(new Error(`days must be an integer between 1 and ${MAX_DAYS}`), { status: 400 });
  }

  return { from: base.from, to: base.to, startDate: base.departDate, days: parsedDays, adults: base.adults };
}

module.exports = { parseSearchPricesParams };
