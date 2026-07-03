const { Router } = require('express');
const controller = require('../controllers/auth');
const requireAuth = require('../middleware/auth');

const router = Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.post('/logout-all', requireAuth, controller.logoutAll);

module.exports = router;
