const UsuarioModel = require('../Modelo/usuarioModel');

async function list(req, res) {
  try {
    const rows = await UsuarioModel.list();
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao listar usuários' });
  }
}

async function get(req, res) {
  try {
    const row = await UsuarioModel.get(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.json(row);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao obter usuário' });
  }
}

async function update(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await UsuarioModel.update(id, req.body);
    return res.json(row);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
}

module.exports = { list, get, update };
