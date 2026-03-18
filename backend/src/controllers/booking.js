const { validateBookingBody } = require('../validators/booking');
const BookingService = require('../services/booking');

async function book(req, res, next) {
  try {
    const { trip, passengers, paymentMethodId } = validateBookingBody(req.body);
    const result = await BookingService.book({
      userId: req.userId,
      trip,
      passengers,
      paymentMethodId,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { book };
