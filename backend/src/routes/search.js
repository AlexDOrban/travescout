const { Router } = require('express');
const requireAuth = require('../middleware/auth');
const controller = require('../controllers/search');

const router = Router();

router.get('/', requireAuth, controller.search);

module.exports = router;
