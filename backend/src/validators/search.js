const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateDate(dateStr, fieldName) {
  if (!DATE_RE.test(dateStr)) {
    throw Object.assign(new Error(`${fieldName} must be YYYY-MM-DD`), { status: 400 });
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw Object.assign(new Error(`${fieldName} is not a valid calendar date`), { status: 400 });
  }
}

function parseSearchParams(query) {
  const { from, to, departDate, returnDate, adults } = query;

  if (!from) throw Object.assign(new Error('from is required'), { status: 400 });
  if (!to) throw Object.assign(new Error('to is required'), { status: 400 });
  if (!departDate) throw Object.assign(new Error('departDate is required'), { status: 400 });
  validateDate(departDate, 'departDate');
  if (returnDate) validateDate(returnDate, 'returnDate');

  const parsedAdults = adults ? parseInt(adults, 10) : 1;
  if (isNaN(parsedAdults) || parsedAdults <= 0 || parsedAdults > 9) {
    throw Object.assign(new Error('adults must be an integer between 1 and 9'), { status: 400 });
  }

  return {
    from: String(from).toUpperCase(),
    to: String(to).toUpperCase(),
    departDate,
    returnDate: returnDate || null,
    adults: parsedAdults,
  };
}

module.exports = { parseSearchParams };
