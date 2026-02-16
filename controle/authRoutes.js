const express = require('express');
const { authRequired } = require('./authMiddleware');
const controller = require('./authController');

const router = express.Router();

router.post('/login', controller.login);
router.post('/register', controller.register);
router.get('/me', authRequired, controller.me);

module.exports = { router };
