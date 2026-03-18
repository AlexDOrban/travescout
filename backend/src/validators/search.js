const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseSearchParams(query) {
  const { from, to, departDate, returnDate, adults } = query;

  if (!from) throw Object.assign(new Error('from is required'), { status: 400 });
  if (!to) throw Object.assign(new Error('to is required'), { status: 400 });
  if (!departDate) throw Object.assign(new Error('departDate is required'), { status: 400 });
  if (!DATE_RE.test(departDate)) throw Object.assign(new Error('departDate must be YYYY-MM-DD'), { status: 400 });
  if (returnDate && !DATE_RE.test(returnDate)) throw Object.assign(new Error('returnDate must be YYYY-MM-DD'), { status: 400 });

  return {
    from: String(from).toUpperCase(),
    to: String(to).toUpperCase(),
    departDate,
    returnDate: returnDate || null,
    adults: adults ? parseInt(adults, 10) : 1,
  };
}

module.exports = { parseSearchParams };
