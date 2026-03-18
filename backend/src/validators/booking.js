function validateBookingBody(body) {
  const { trip, passengers, paymentMethodId } = body || {};

  if (!trip) throw Object.assign(new Error('trip is required'), { status: 400 });
  if (!trip.provider) throw Object.assign(new Error('trip.provider is required'), { status: 400 });
  if (!trip.origin) throw Object.assign(new Error('trip.origin is required'), { status: 400 });
  if (!trip.destination) throw Object.assign(new Error('trip.destination is required'), { status: 400 });
  if (!trip.departAt) throw Object.assign(new Error('trip.departAt is required'), { status: 400 });
  if (typeof trip.priceEur !== 'number' || trip.priceEur <= 0) {
    throw Object.assign(new Error('trip.priceEur must be a positive number'), { status: 400 });
  }

  if (!Array.isArray(passengers) || passengers.length === 0) {
    throw Object.assign(new Error('passengers must be a non-empty array'), { status: 400 });
  }
  passengers.forEach((p, i) => {
    if (!p.name) throw Object.assign(new Error(`passengers[${i}].name is required`), { status: 400 });
    if (!p.email) throw Object.assign(new Error(`passengers[${i}].email is required`), { status: 400 });
  });

  if (!paymentMethodId) throw Object.assign(new Error('paymentMethodId is required'), { status: 400 });

  return { trip, passengers, paymentMethodId };
}

module.exports = { validateBookingBody };
