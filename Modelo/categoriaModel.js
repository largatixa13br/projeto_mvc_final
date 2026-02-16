const { query } = require('./db');

async function list() {
  return await query('SELECT * FROM categorias ORDER BY nome ASC');
}

async function create({ nome }) {
  const res = await query('INSERT INTO categorias (nome) VALUES (?)', [nome]);
  return res.insertId;
}

async function remove(id) {
  await query('DELETE FROM categorias WHERE id = ?', [id]);
  return true;
}

module.exports = { list, create, remove };
