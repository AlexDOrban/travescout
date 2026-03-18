const Trip = require('../models/trip');

async function list(req, res, next) {
  try {
    const trips = await Trip.findByUserId(req.userId);
    res.json({ trips });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
