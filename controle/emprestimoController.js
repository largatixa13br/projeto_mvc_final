const EmprestimoModel = require('../Modelo/emprestimoModel');

async function list(req, res) {
  try {
    await EmprestimoModel.marcarAtrasos();
    const status = req.query.status || null;
    const usuario_id = req.user.perfil === 'ADMIN' ? null : req.user.id;
    const rows = await EmprestimoModel.list({ usuario_id, status });
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao listar empréstimos' });
  }
}

async function create(req, res) {
  try {
    const {
      equipamento_id,
      quantidade,
      nome_solicitante,
      celular,
      data_retirada,
      data_prevista_devolucao,
      observacao
    } = req.body;

    const id = await EmprestimoModel.create({
      usuario_id: req.user.id,
      equipamento_id: Number(equipamento_id),
      quantidade: Number(quantidade || 1),
      nome_solicitante: (nome_solicitante || '').toString().trim() || null,
      celular: (celular || '').toString().trim() || null,
      data_retirada: data_retirada || null,
      data_prevista_devolucao: data_prevista_devolucao || null,
      observacao: observacao || null
    });

    return res.status(201).json({ id });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || 'Erro ao criar empréstimo' });
  }
}

async function update(req, res) {
  try {
    const emprestimo_id = Number(req.params.id);
    const patch = {
      quantidade: req.body.quantidade,
      nome_solicitante: req.body.nome_solicitante,
      celular: req.body.celular,
      data_retirada: req.body.data_retirada,
      data_prevista_devolucao: req.body.data_prevista_devolucao,
      observacao: req.body.observacao
    };

    const row = await EmprestimoModel.updateSolicitacao({
      emprestimo_id,
      usuario_id: req.user.id,
      isAdmin: req.user.perfil === 'ADMIN',
      patch
    });

    return res.json(row);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || 'Erro ao alterar empréstimo' });
  }
}

async function devolver(req, res) {
  try {
    const emprestimo_id = Number(req.params.id);
    await EmprestimoModel.devolver({
      emprestimo_id,
      usuario_id: req.user.id,
      isAdmin: req.user.perfil === 'ADMIN'
    });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || 'Erro ao devolver' });
  }
}

module.exports = { list, create, update, devolver };
