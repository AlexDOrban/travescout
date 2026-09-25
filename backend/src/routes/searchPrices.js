const { Router } = require('express');
const requireAuth = require('../middleware/auth');
const controller = require('../controllers/searchPrices');

const router = Router();

router.get('/', requireAuth, controller.searchPrices);

module.exports = router;
