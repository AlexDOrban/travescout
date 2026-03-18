const { Router } = require('express');
const requireAuth = require('../middleware/auth');
const controller = require('../controllers/trips');

const router = Router();

router.get('/', requireAuth, controller.list);

module.exports = router;
