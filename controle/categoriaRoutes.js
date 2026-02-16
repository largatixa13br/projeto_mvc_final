const express = require('express');
const { authRequired, requireAdmin } = require('./authMiddleware');
const controller = require('./categoriaController');

const router = express.Router();

router.get('/', authRequired, controller.list);
router.post('/', authRequired, requireAdmin, controller.create);
router.delete('/:id', authRequired, requireAdmin, controller.remove);

module.exports = { router };
