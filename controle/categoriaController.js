const CategoriaModel = require('../Modelo/categoriaModel');

async function list(req, res) {
  try {
    const rows = await CategoriaModel.list();
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao listar categorias' });
  }
}

async function create(req, res) {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'Informe o nome' });
    const id = await CategoriaModel.create({ nome });
    return res.status(201).json({ id, nome });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao criar categoria' });
  }
}

async function remove(req, res) {
  try {
    await CategoriaModel.remove(Number(req.params.id));
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao remover categoria' });
  }
}

module.exports = { list, create, remove };
