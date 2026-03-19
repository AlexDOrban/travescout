const Itinerary = require('../models/itinerary');

async function list(req, res, next) {
  try {
    const itineraries = await Itinerary.findByUserId(req.userId);
    res.json({ itineraries });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
