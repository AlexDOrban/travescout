const Trip = require('../models/trip');

async function list(req, res, next) {
  try {
    // Itinerary legs are rendered inside their itinerary card; only
    // standalone trips belong in this list.
    const trips = await Trip.findStandaloneByUserId(req.userId);
    res.json({ trips });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
