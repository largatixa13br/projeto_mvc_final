const express = require('express');
const { authRequired, requireAdmin } = require('./authMiddleware');
const controller = require('./equipamentoController');

const router = express.Router();

router.get('/', authRequired, controller.list);
router.get('/:id', authRequired, controller.get);

router.post('/', authRequired, requireAdmin, controller.upload.array('imagens', 8), controller.create);
router.post('/:id/imagens', authRequired, requireAdmin, controller.upload.array('imagens', 8), controller.addImages);

router.put('/:id', authRequired, requireAdmin, controller.update);
router.put('/:id/toggle', authRequired, requireAdmin, controller.toggleAtivo);
router.delete('/:id', authRequired, requireAdmin, controller.remove);

module.exports = { router };
