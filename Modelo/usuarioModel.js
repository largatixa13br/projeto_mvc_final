const { query } = require('./db');

async function list() {
  return await query('SELECT id, nome, email, perfil, ativo, created_at FROM usuarios ORDER BY id DESC');
}

async function get(id) {
  const rows = await query('SELECT id, nome, email, perfil, ativo, created_at FROM usuarios WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function update(id, { nome, email, perfil, ativo }) {
  await query(
    'UPDATE usuarios SET nome = COALESCE(?, nome), email = COALESCE(?, email), perfil = COALESCE(?, perfil), ativo = COALESCE(?, ativo) WHERE id = ?',
    [nome ?? null, email ?? null, perfil ?? null, ativo ?? null, id]
  );
  return await get(id);
}

module.exports = { list, get, update };
