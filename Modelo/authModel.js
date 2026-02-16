const { query } = require('./db');

async function findByEmail(email) {
  const rows = await query('SELECT * FROM usuarios WHERE email = ? AND ativo = 1 LIMIT 1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const rows = await query('SELECT id, nome, email, perfil, ativo, created_at FROM usuarios WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function createUser({ nome, email, senha_hash, perfil = 'USER' }) {
  const res = await query('INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?,?,?,?)', [nome, email, senha_hash, perfil]);
  return res.insertId;
}

module.exports = { findByEmail, findById, createUser };
