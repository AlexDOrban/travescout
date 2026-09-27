const { validateItineraryBookingBody } = require('../validators/itineraryBooking');
const { bookItinerary } = require('../services/itineraryBooking');

async function book(req, res, next) {
  try {
    const { legs, passengers, paymentMethodId, origin, destination, tripType } = validateItineraryBookingBody(req.body);
    const result = await bookItinerary({
      userId: req.userId,
      legs,
      passengers,
      paymentMethodId,
      origin,
      destination,
      tripType,
      idempotencyKey: req.get('Idempotency-Key') || req.body.idempotencyKey || undefined,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { book };
