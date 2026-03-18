const { Router } = require('express');
const requireAuth = require('../middleware/auth');
const controller = require('../controllers/booking');

const router = Router();

router.post('/', requireAuth, controller.book);

module.exports = router;
