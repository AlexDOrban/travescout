const { Router } = require('express');
const requireAuth = require('../middleware/auth');
const controller = require('../controllers/itineraryBooking');

const router = Router();
router.post('/', requireAuth, controller.book);

module.exports = router;
