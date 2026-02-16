const express = require('express');
const { authRequired, requireAdmin } = require('./authMiddleware');
const controller = require('./usuarioController');

const router = express.Router();

router.get('/', authRequired, requireAdmin, controller.list);
router.get('/:id', authRequired, requireAdmin, controller.get);
router.put('/:id', authRequired, requireAdmin, controller.update);

module.exports = { router };
