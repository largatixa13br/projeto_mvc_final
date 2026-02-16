const { query, transaction } = require('./db');

async function list({ includeInativos = false } = {}) {
  const rows = await query(`
    SELECT e.*, c.nome AS categoria_nome
    FROM equipamentos e
    LEFT JOIN categorias c ON c.id = e.categoria_id
    WHERE (? = 1 OR e.ativo = 1)
    ORDER BY e.id DESC
  `, [includeInativos ? 1 : 0]);

  const ids = rows.map(r => r.id);
  if (ids.length === 0) return [];

  const imgs = await query(
    `SELECT * FROM equipamento_imagens WHERE equipamento_id IN (${ids.map(()=>'?').join(',')})`,
    ids
  );

  const byEquip = new Map();
  imgs.forEach(i => {
    if (!byEquip.has(i.equipamento_id)) byEquip.set(i.equipamento_id, []);
    byEquip.get(i.equipamento_id).push(i);
  });

  return rows.map(r => ({ ...r, imagens: byEquip.get(r.id) || [] }));
}

async function get(id, { includeInativos = false } = {}) {
  const rows = await query(`
    SELECT e.*, c.nome AS categoria_nome
    FROM equipamentos e
    LEFT JOIN categorias c ON c.id = e.categoria_id
    WHERE e.id = ? AND (? = 1 OR e.ativo = 1)
    LIMIT 1
  `, [id, includeInativos ? 1 : 0]);

  const equip = rows[0] || null;
  if (!equip) return null;

  const imagens = await query('SELECT * FROM equipamento_imagens WHERE equipamento_id = ? ORDER BY id DESC', [id]);
  return { ...equip, imagens };
}

async function create(equip, imagens = []) {
  return await transaction(async (conn) => {
    const [res] = await conn.execute(
      `INSERT INTO equipamentos (nome, descricao, patrimonio, categoria_id, ativo, status, quantidade_total, quantidade_disponivel, localizacao)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        equip.nome,
        equip.descricao ?? null,
        equip.patrimonio ?? null,
        equip.categoria_id ?? null,
        (equip.ativo === undefined || equip.ativo === null) ? 1 : Number(equip.ativo ? 1 : 0),
        equip.status ?? 'DISPONIVEL',
        Number(equip.quantidade_total ?? 1),
        Number(equip.quantidade_disponivel ?? equip.quantidade_total ?? 1),
        equip.localizacao ?? null
      ]
    );

    const equipamentoId = res.insertId;

    for (const img of imagens) {
      await conn.execute(
        `INSERT INTO equipamento_imagens (equipamento_id, filename, original_name, mimetype, tamanho)
         VALUES (?,?,?,?,?)`,
        [equipamentoId, img.filename, img.originalname, img.mimetype, img.size]
      );
    }

    return equipamentoId;
  });
}

async function addImages(equipamentoId, imagens = []) {
  return await transaction(async (conn) => {
    for (const img of imagens) {
      await conn.execute(
        `INSERT INTO equipamento_imagens (equipamento_id, filename, original_name, mimetype, tamanho)
         VALUES (?,?,?,?,?)`,
        [equipamentoId, img.filename, img.originalname, img.mimetype, img.size]
      );
    }
    return true;
  });
}

async function update(id, equip) {
  await query(
    `UPDATE equipamentos SET
      nome = COALESCE(?, nome),
      descricao = COALESCE(?, descricao),
      patrimonio = COALESCE(?, patrimonio),
      categoria_id = COALESCE(?, categoria_id),
      ativo = COALESCE(?, ativo),
      status = COALESCE(?, status),
      quantidade_total = COALESCE(?, quantidade_total),
      quantidade_disponivel = COALESCE(?, quantidade_disponivel),
      localizacao = COALESCE(?, localizacao)
     WHERE id = ?`,
    [
      equip.nome ?? null,
      equip.descricao ?? null,
      equip.patrimonio ?? null,
      equip.categoria_id ?? null,
      (equip.ativo === undefined) ? null : Number(equip.ativo ? 1 : 0),
      equip.status ?? null,
      equip.quantidade_total ?? null,
      equip.quantidade_disponivel ?? null,
      equip.localizacao ?? null,
      id
    ]
  );
  return await get(id, { includeInativos: true });
}

async function toggleAtivo(id) {
  await query(`UPDATE equipamentos SET ativo = IF(ativo = 1, 0, 1) WHERE id = ?`, [id]);
  return await get(id, { includeInativos: true });
}

async function remove(id) {
  await query('DELETE FROM equipamentos WHERE id = ?', [id]);
  return true;
}

module.exports = { list, get, create, update, remove, addImages, toggleAtivo };
