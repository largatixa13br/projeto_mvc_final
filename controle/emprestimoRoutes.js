const express = require('express');
const { authRequired } = require('./authMiddleware');
const controller = require('./emprestimoController');

const router = express.Router();

router.get('/', authRequired, controller.list);
router.post('/', authRequired, controller.create);
router.put('/:id', authRequired, controller.update);
router.put('/:id/devolver', authRequired, controller.devolver);

module.exports = { router };
