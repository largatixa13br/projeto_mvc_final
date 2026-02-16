const { query, transaction } = require('./db');

async function list({ usuario_id = null, status = null } = {}) {
  const params = [];
  let where = ' WHERE 1=1 ';
  if (usuario_id) { where += ' AND emp.usuario_id = ? '; params.push(usuario_id); }
  if (status) { where += ' AND emp.status = ? '; params.push(status); }

  return await query(`
    SELECT emp.*,
      u.nome AS usuario_nome, u.email AS usuario_email,
      e.nome AS equipamento_nome, e.patrimonio AS equipamento_patrimonio
    FROM emprestimos emp
    INNER JOIN usuarios u ON u.id = emp.usuario_id
    INNER JOIN equipamentos e ON e.id = emp.equipamento_id
    ${where}
    ORDER BY emp.id DESC
  `, params);
}

async function create({ usuario_id, equipamento_id, quantidade = 1, nome_solicitante = null, celular = null, data_retirada = null, data_prevista_devolucao = null, observacao = null }) {
  quantidade = Number(quantidade || 1);
  if (quantidade <= 0) throw new Error('Quantidade inválida');

  return await transaction(async (conn) => {
    const [eqRows] = await conn.execute('SELECT id, ativo, quantidade_disponivel, status FROM equipamentos WHERE id = ? FOR UPDATE', [equipamento_id]);
    const eq = eqRows[0];
    if (!eq) throw new Error('Equipamento não encontrado');
    if (Number(eq.ativo) !== 1) throw new Error('Equipamento desativado');
    if (eq.status === 'MANUTENCAO') throw new Error('Equipamento em manutenção');
    if (eq.quantidade_disponivel < quantidade) throw new Error('Sem disponibilidade para a quantidade solicitada');

    const [res] = await conn.execute(
      `INSERT INTO emprestimos (usuario_id, equipamento_id, quantidade, nome_solicitante, celular, data_retirada, data_prevista_devolucao, observacao)
       VALUES (?,?,?,?,?,?,?,?)`,
      [usuario_id, equipamento_id, quantidade, nome_solicitante, celular, data_retirada, data_prevista_devolucao, observacao]
    );

    const novaDisp = eq.quantidade_disponivel - quantidade;
    await conn.execute(
      `UPDATE equipamentos
       SET quantidade_disponivel = ?, status = CASE WHEN ? = 0 THEN 'EMPRESTADO' ELSE status END
       WHERE id = ?`,
      [novaDisp, novaDisp, equipamento_id]
    );

    return res.insertId;
  });
}

async function updateSolicitacao({ emprestimo_id, usuario_id = null, isAdmin = false, patch = {} }) {
  return await transaction(async (conn) => {
    const [rows] = await conn.execute('SELECT * FROM emprestimos WHERE id = ? FOR UPDATE', [emprestimo_id]);
    const emp = rows[0];
    if (!emp) throw new Error('Empréstimo não encontrado');

    if (!isAdmin && usuario_id && emp.usuario_id !== usuario_id) {
      throw new Error('Você não tem permissão para alterar este empréstimo');
    }

    if (emp.status !== 'ABERTO' && emp.status !== 'ATRASADO') {
      throw new Error('Só é possível alterar empréstimos em aberto/atrasados');
    }

    // Se quantidade mudou, ajustar disponibilidade do equipamento.
    let newQtd = (patch.quantidade === undefined || patch.quantidade === null) ? null : Number(patch.quantidade);
    if (newQtd !== null && (!Number.isFinite(newQtd) || newQtd <= 0)) throw new Error('Quantidade inválida');

    if (newQtd !== null && newQtd !== emp.quantidade) {
      const diff = newQtd - emp.quantidade; // positivo = precisa de mais
      const [eqRows] = await conn.execute('SELECT id, ativo, quantidade_disponivel, quantidade_total, status FROM equipamentos WHERE id = ? FOR UPDATE', [emp.equipamento_id]);
      const eq = eqRows[0];
      if (!eq) throw new Error('Equipamento não encontrado');
      if (Number(eq.ativo) !== 1) throw new Error('Equipamento desativado');
      if (diff > 0 && eq.quantidade_disponivel < diff) throw new Error('Sem disponibilidade para aumentar a quantidade');

      const novaDisp = diff > 0
        ? (eq.quantidade_disponivel - diff)
        : Math.min(eq.quantidade_total, eq.quantidade_disponivel + Math.abs(diff));

      await conn.execute(
        `UPDATE equipamentos
         SET quantidade_disponivel = ?,
             status = CASE WHEN ? = 0 THEN 'EMPRESTADO' ELSE CASE WHEN status = 'EMPRESTADO' AND ? > 0 THEN 'DISPONIVEL' ELSE status END END
         WHERE id = ?`,
        [novaDisp, novaDisp, novaDisp, emp.equipamento_id]
      );
    }

    await conn.execute(
      `UPDATE emprestimos SET
         quantidade = COALESCE(?, quantidade),
         nome_solicitante = COALESCE(?, nome_solicitante),
         celular = COALESCE(?, celular),
         data_retirada = COALESCE(?, data_retirada),
         data_prevista_devolucao = COALESCE(?, data_prevista_devolucao),
         observacao = COALESCE(?, observacao)
       WHERE id = ?`,
      [
        newQtd,
        patch.nome_solicitante ?? null,
        patch.celular ?? null,
        patch.data_retirada ?? null,
        patch.data_prevista_devolucao ?? null,
        patch.observacao ?? null,
        emprestimo_id
      ]
    );

    const [out] = await conn.execute('SELECT * FROM emprestimos WHERE id = ? LIMIT 1', [emprestimo_id]);
    return out[0];
  });
}

async function devolver({ emprestimo_id, usuario_id = null, isAdmin = false }) {
  return await transaction(async (conn) => {
    const [rows] = await conn.execute('SELECT * FROM emprestimos WHERE id = ? FOR UPDATE', [emprestimo_id]);
    const emp = rows[0];
    if (!emp) throw new Error('Empréstimo não encontrado');

    if (!isAdmin && usuario_id && emp.usuario_id !== usuario_id) {
      throw new Error('Você não tem permissão para devolver este empréstimo');
    }

    if (emp.status !== 'ABERTO' && emp.status !== 'ATRASADO') {
      throw new Error('Empréstimo já finalizado/cancelado');
    }

    const [eqRows] = await conn.execute('SELECT id, quantidade_disponivel, quantidade_total FROM equipamentos WHERE id = ? FOR UPDATE', [emp.equipamento_id]);
    const eq = eqRows[0];
    if (!eq) throw new Error('Equipamento não encontrado');

    const novaDisp = Math.min(eq.quantidade_total, eq.quantidade_disponivel + emp.quantidade);

    await conn.execute(`UPDATE emprestimos SET status = 'DEVOLVIDO', data_devolucao = NOW() WHERE id = ?`, [emprestimo_id]);
    await conn.execute(`UPDATE equipamentos SET quantidade_disponivel = ?, status = 'DISPONIVEL' WHERE id = ?`, [novaDisp, emp.equipamento_id]);

    return true;
  });
}

async function marcarAtrasos() {
  await query(`
    UPDATE emprestimos
    SET status = 'ATRASADO'
    WHERE status = 'ABERTO'
      AND data_prevista_devolucao IS NOT NULL
      AND data_prevista_devolucao < CURDATE()
  `);
  return true;
}

module.exports = { list, create, updateSolicitacao, devolver, marcarAtrasos };
