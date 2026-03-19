const { Router } = require('express');
const requireAuth = require('../middleware/auth');
const controller = require('../controllers/itineraries');

const router = Router();
router.get('/', requireAuth, controller.list);

module.exports = router;
