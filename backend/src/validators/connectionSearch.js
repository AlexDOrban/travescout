function validateConnectionSearchParams(query) {
  const { hub, cityCode, direction, dateTime, adults } = query;

  if (!hub || !cityCode || !direction || !dateTime) {
    throw Object.assign(new Error('Missing required params: hub, cityCode, direction, dateTime'), { status: 400 });
  }

  if (!['to', 'from'].includes(direction)) {
    throw Object.assign(new Error('direction must be "to" or "from"'), { status: 400 });
  }

  const dt = new Date(dateTime);
  if (isNaN(dt.getTime())) {
    throw Object.assign(new Error('dateTime must be a valid ISO 8601 date'), { status: 400 });
  }

  const parsedAdults = parseInt(adults || '1', 10);
  if (isNaN(parsedAdults) || parsedAdults < 1 || parsedAdults > 9) {
    throw Object.assign(new Error('adults must be 1-9'), { status: 400 });
  }

  return { hub, cityCode, direction, dateTime: dt.toISOString(), adults: parsedAdults };
}

module.exports = { validateConnectionSearchParams };
