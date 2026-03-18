const { Router } = require('express');
const controller = require('../controllers/auth');

const router = Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);

module.exports = router;
