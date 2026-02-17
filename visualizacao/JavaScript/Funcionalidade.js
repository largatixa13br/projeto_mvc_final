// Utilitários
const API = (p) => `${location.origin}${p}`;
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function setMsg(el, text, type) {
  if (!el) return;
  el.textContent = text || '';
  el.classList.remove('ok','err');
  if (type) el.classList.add(type);
}

function getToken() { return localStorage.getItem('token'); }

function setSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.href = '/';
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = opts.headers || {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  opts.headers = headers;
  const res = await fetch(API(path), opts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);
  return data;
}

// Login page
async function initLogin() {
  const frmLogin = $('#frmLogin');
  if (!frmLogin) return;

  frmLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg($('#msg'), 'Entrando...');
    try {
      const email = $('#email').value.trim();
      const senha = $('#senha').value;
      const out = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email, senha })
      });
      setSession(out.token, out.user);
      location.href = '/app';
    } catch (err) {
      setMsg($('#msg'), err.message, 'err');
    }
  });

  const frmRegister = $('#frmRegister');
  frmRegister?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg($('#rMsg'), 'Criando conta...');
    try {
      const nome = $('#rNome').value.trim();
      const email = $('#rEmail').value.trim();
      const senha = $('#rSenha').value;
      const out = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ nome, email, senha })
      });
      setSession(out.token, out.user);
      location.href = '/app';
    } catch (err) {
      setMsg($('#rMsg'), err.message, 'err');
    }
  });
}

// App state
let state = { equipamentos: [], categorias: [], emprestimos: [], selectedEquipId: null, selectedEmprestimoId: null, editingEquipId: null };

function requireAuthOrRedirect() {
  if (!getToken()) location.href = '/';
}

function showTab(name) {
  $('#panelEquipamentos').style.display = (name === 'equipamentos') ? '' : 'none';
  $('#panelEmprestimos').style.display = (name === 'emprestimos') ? '' : 'none';
  $('#panelCategorias').style.display = (name === 'categorias') ? '' : 'none';
  $('#panelUsuarios').style.display = (name === 'usuarios') ? '' : 'none';
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
}

function fmtDateTime(v) { if (!v) return '—'; return new Date(v).toLocaleString(); }
function fmtDate(v) { if (!v) return '—'; return new Date(v + 'T00:00:00').toLocaleDateString(); }
function equipThumbUrl(img) { return `/uploads/equipamentos/${img.filename}`; }

function escapeHtml(str) {
  return (str ?? '').toString()
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function renderEquipTable() {
  const tbody = $('#tblEquip tbody');
  const admin = (getUser()?.perfil === 'ADMIN');
  if (!tbody) return;
  tbody.innerHTML = '';

  const q = ($('#search')?.value || '').toLowerCase().trim();
  const rows = state.equipamentos.filter(e => {
    if (!q) return true;
    return [e.nome, e.patrimonio, e.categoria_nome, e.localizacao].some(v => (v || '').toLowerCase().includes(q));
  });

  for (const e of rows) {
    const tr = document.createElement('tr');
    const ativoTag = (e.ativo === 0 || e.ativo === '0') ? ' <span class="muted">(inativo)</span>' : '';
    tr.innerHTML = `
      <td>${e.id}</td>
      <td><span class="link" data-eid="${e.id}">${escapeHtml(e.nome)}</span>${ativoTag}</td>
      <td>${escapeHtml(e.categoria_nome || '—')}</td>
      <td>${escapeHtml(e.patrimonio || '—')}</td>
      <td>${e.quantidade_disponivel}/${e.quantidade_total}</td>
      <td>${escapeHtml(e.status)}</td>
      <td>
        <button class="btn btn-ghost" data-eid="${e.id}">Ver</button>
        ${admin ? `<button class="btn btn-ghost" data-edit-eid="${e.id}">Alterar</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll('[data-eid]').forEach(el => el.addEventListener('click', () => selectEquip(Number(el.dataset.eid))));

  tbody.querySelectorAll('[data-edit-eid]').forEach(el => el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    openEditEquip(Number(el.dataset.editEid));
  }));
}

function renderEquipDetail(e) {
  $('#equipHint').style.display = e ? 'none' : '';
  $('#equipDetalhe').style.display = e ? '' : 'none';
  if (!e) return;

  $('#equipNome').textContent = e.nome;
  $('#equipMeta').textContent = [
    e.categoria_nome ? `Categoria: ${e.categoria_nome}` : null,
    e.patrimonio ? `Patrimônio: ${e.patrimonio}` : null,
    e.localizacao ? `Local: ${e.localizacao}` : null
  ].filter(Boolean).join(' • ') || '—';

  $('#equipStatus').textContent = e.status;
  $('#equipDisp').textContent = `Disponível: ${e.quantidade_disponivel}/${e.quantidade_total}`;
  $('#equipDesc').textContent = e.descricao || 'Sem descrição.';

  const gal = $('#equipGallery');
  gal.innerHTML = '';
  (e.imagens || []).slice(0, 12).forEach(img => {
    const el = document.createElement('img');
    el.src = equipThumbUrl(img);
    el.className = 'thumb';
    el.alt = img.original_name;
    el.loading = 'lazy';
    el.title = img.original_name;
    el.addEventListener('click', () => window.open(el.src, '_blank'));
    gal.appendChild(el);
  });

  $('#empQuantidade').value = 1;
  $('#empNomeSolic').value = '';
  $('#empCelular').value = '';
  $('#empDataRetirada').value = '';
  $('#empPrevDevol').value = '';
  $('#empObs').value = '';
  setMsg($('#empMsg'), '');

  // tentar preencher a partir de um empréstimo em aberto deste equipamento (se existir)
  state.selectedEmprestimoId = null;
  const empAberto = (state.emprestimos || []).find(x => Number(x.equipamento_id) === Number(e.id) && (x.status === 'ABERTO' || x.status === 'ATRASADO'));
  if (empAberto) {
    state.selectedEmprestimoId = empAberto.id;
    $('#empQuantidade').value = empAberto.quantidade ?? 1;
    $('#empNomeSolic').value = empAberto.nome_solicitante || '';
    $('#empCelular').value = empAberto.celular || '';
    $('#empDataRetirada').value = empAberto.data_retirada || '';
    $('#empPrevDevol').value = empAberto.data_prevista_devolucao || '';
    $('#empObs').value = empAberto.observacao || '';
  }

  const btnAlt = $('#btnAlterarEmp');
  if (btnAlt) btnAlt.disabled = !state.selectedEmprestimoId;

  const user = getUser();
  const isAdmin = user?.perfil === 'ADMIN';
  $('#adminEquipActions').style.display = isAdmin ? '' : 'none';

  const btnToggle = $('#btnToggleEquip');
  if (btnToggle) {
    const ativo = Number(e.ativo) === 1;
    btnToggle.textContent = ativo ? 'Desativar produto' : 'Ativar produto';
  }
}

async function selectEquip(id) {
  state.selectedEquipId = id;
  const e = await apiFetch(`/api/equipamentos/${id}`);
  state.equipamentos = state.equipamentos.map(x => x.id === id ? e : x);
  renderEquipDetail(e);
}

async function openEditEquip(id) {
  const user = getUser();
  if (user?.perfil !== 'ADMIN') return;

  setMsg($('#editEquipMsg'), '');
  try {
    const e = await apiFetch(`/api/equipamentos/${id}`);
    state.editingEquipId = id;

    $('#editNome').value = e.nome || '';
    $('#editPatrimonio').value = e.patrimonio || '';
    $('#editLocalizacao').value = e.localizacao || '';
    $('#editStatus').value = e.status || 'DISPONIVEL';
    $('#editQtdTotal').value = e.quantidade_total ?? 1;
    $('#editQtdDisp').value = e.quantidade_disponivel ?? 1;
    $('#editDescricao').value = e.descricao || '';

    // garante categorias no select
    fillCategoriaSelect();
    $('#selCatEdit').value = (e.categoria_id ?? '').toString();

    openModal('#modalEditEquip', true);
  } catch (err) {
    alert(err.message);
  }
}

function renderEmprestimos() {
  const tbody = $('#tblEmp tbody');
  tbody.innerHTML = '';
  for (const emp of state.emprestimos) {
    const canDevolver = emp.status === 'ABERTO' || emp.status === 'ATRASADO';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${emp.id}</td>
      <td>${escapeHtml(emp.equipamento_nome)} ${emp.equipamento_patrimonio ? `<span class="muted">(${escapeHtml(emp.equipamento_patrimonio)})</span>` : ''}</td>
      <td>${emp.quantidade}</td>
      <td>${escapeHtml(emp.nome_solicitante || '—')}</td>
      <td>${escapeHtml(emp.celular || '—')}</td>
      <td>${fmtDateTime(emp.data_emprestimo)}</td>
      <td>${emp.data_devolucao ? fmtDateTime(emp.data_devolucao) : fmtDate(emp.data_prevista_devolucao)}</td>
      <td>${escapeHtml(emp.status)}</td>
      <td><button class="btn btn-ghost" data-devolver="${emp.id}" ${canDevolver ? '' : 'disabled'}>Devolver</button></td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll('[data-devolver]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.devolver);
      setMsg($('#empListMsg'), 'Processando...');
      try {
        await apiFetch(`/api/emprestimos/${id}/devolver`, { method:'PUT' });
        setMsg($('#empListMsg'), 'Devolução registrada.', 'ok');
        await refreshAll();
      } catch (err) {
        setMsg($('#empListMsg'), err.message, 'err');
      }
    });
  });
}

function renderCategorias() {
  const tbody = $('#tblCat tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  for (const c of state.categorias) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${escapeHtml(c.nome)}</td>
      <td><button class="btn btn-ghost" data-delcat="${c.id}">Excluir</button></td>
    `;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll('[data-delcat]').forEach(b => {
    b.addEventListener('click', async () => {
      const id = Number(b.dataset.delcat);
      setMsg($('#catMsg'), 'Excluindo...');
      try {
        await apiFetch(`/api/categorias/${id}`, { method:'DELETE' });
        setMsg($('#catMsg'), 'Excluída.', 'ok');
        await loadCategorias();
        await loadEquipamentos();
      } catch (err) {
        setMsg($('#catMsg'), err.message, 'err');
      }
    });
  });
}

function fillCategoriaSelect() {
  const selects = [$('#selCat'), $('#selCatEdit')].filter(Boolean);
  if (!selects.length) return;

  for (const sel of selects) {
    sel.innerHTML = `<option value="">—</option>`;
    state.categorias.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.nome;
      sel.appendChild(o);
    });
  }
}

async function loadCategorias() {
  state.categorias = await apiFetch('/api/categorias');
  fillCategoriaSelect();
  renderCategorias();
}

async function loadEquipamentos() {
  state.equipamentos = await apiFetch('/api/equipamentos');
  renderEquipTable();
  if (state.selectedEquipId) {
    const found = state.equipamentos.find(e => e.id === state.selectedEquipId);
    if (found) renderEquipDetail(found);
  }
}

async function loadEmprestimos() {
  state.emprestimos = await apiFetch('/api/emprestimos');
  renderEmprestimos();
}

async function loadUsuariosAdmin() {
  const tbody = $('#tblUsers tbody');
  if (!tbody) return;
  setMsg($('#usrMsg'), 'Carregando...');
  try {
    const users = await apiFetch('/api/usuarios');
    tbody.innerHTML = '';
    for (const u of users) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${escapeHtml(u.nome)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.perfil)}</td>
        <td>${u.ativo ? 'Sim' : 'Não'}</td>
      `;
      tbody.appendChild(tr);
    }
    setMsg($('#usrMsg'), '');
  } catch (err) {
    setMsg($('#usrMsg'), err.message, 'err');
  }
}

async function refreshAll() { await Promise.all([loadCategorias(), loadEquipamentos(), loadEmprestimos()]); }

function openModal(id, open=true) {
  const el = $(id);
  if (!el) return;
  el.classList.toggle('open', open);
}

function pickBorrowed() {
  const borrowed = (state.equipamentos || []).filter(e => e.status === 'EMPRESTADO' || Number(e.quantidade_disponivel) === 0);
  return borrowed;
}

function formatBorrowItem(e) {
  const cat = e.categoria_nome ? ` • ${e.categoria_nome}` : '';
  const pat = e.patrimonio ? ` • Patrimônio: ${e.patrimonio}` : '';
  const qty = ` • Disponível: ${e.quantidade_disponivel}/${e.quantidade_total}`;
  return `📌 ${e.nome}${cat}${pat}${qty}`;
}

function scheduleNextTickerTick() {
  return 3000 + Math.floor(Math.random() * 7001); // 3 a 10s
}

function initBorrowTicker() {
  const box = $('#borrowTicker');
  const item = $('#borrowTickerItem');
  if (!box || !item) return;

  let idx = 0;
  let timer = null;

  function tick() {
    const list = pickBorrowed();
    if (!list.length) {
      box.style.display = 'none';
      if (timer) clearTimeout(timer);
      timer = setTimeout(tick, scheduleNextTickerTick());
      return;
    }

    box.style.display = '';
    const e = list[idx % list.length];
    idx++;

    item.classList.remove('animate');
    void item.offsetWidth;
    item.textContent = formatBorrowItem(e);
    item.classList.add('animate');

    timer = setTimeout(tick, scheduleNextTickerTick());
  }

  tick();
}

async function initApp() {
  const onApp = $('#panelEquipamentos');
  if (!onApp) return;

  requireAuthOrRedirect();

  const user = getUser();
  $('#userChip').textContent = user ? `${user.nome} • ${user.perfil}` : '—';

  const isAdmin = user?.perfil === 'ADMIN';
  $('#btnNovoEquip').style.display = isAdmin ? '' : 'none';
  $('#btnNovaCategoria').style.display = isAdmin ? '' : 'none';
  $('#tabCategorias').style.display = isAdmin ? '' : 'none';
  $('#tabUsuarios').style.display = isAdmin ? '' : 'none';

  $('#btnLogout').addEventListener('click', logout);

  $$('.tab').forEach(t => t.addEventListener('click', async () => {
    showTab(t.dataset.tab);
    if (t.dataset.tab === 'emprestimos') await loadEmprestimos();
    if (t.dataset.tab === 'categorias') await loadCategorias();
    if (t.dataset.tab === 'usuarios') await loadUsuariosAdmin();
  }));

  $('#search').addEventListener('input', renderEquipTable);

    // define mínimo para data prevista (hoje)
  const minPrev = new Date();
  const yyyy = minPrev.getFullYear();
  const mm = String(minPrev.getMonth()+1).padStart(2,'0');
  const dd = String(minPrev.getDate()).padStart(2,'0');
  if ($('#empPrevDevol')) $('#empPrevDevol').min = `${yyyy}-${mm}-${dd}`;

  $('#frmEmprestimo').addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg($('#empMsg'), 'Enviando...');
    try {
      const equipamento_id = state.selectedEquipId;
      if (!equipamento_id) throw new Error('Selecione um equipamento');
      const quantidade = Number($('#empQuantidade').value || 1);
      const nome_solicitante = ($('#empNomeSolic').value || '').trim();
      const celular = ($('#empCelular').value || '').trim();
      const data_retirada = $('#empDataRetirada').value || null;
      const data_prevista_devolucao = $('#empPrevDevol').value || null;
      if (!nome_solicitante) throw new Error('Informe o nome do solicitante');
      if (!celular) throw new Error('Informe o celular');
      if (!data_retirada) throw new Error('Informe a data da retirada');
      if (!data_prevista_devolucao) throw new Error('Informe a data prevista de devolução');
      const observacao = $('#empObs').value || null;

      await apiFetch('/api/emprestimos', {
        method:'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ equipamento_id, quantidade, nome_solicitante, celular, data_retirada, data_prevista_devolucao, observacao })
      });

      setMsg($('#empMsg'), 'Solicitação criada. Você pode alterar os dados pelo botão "Alterar dados" enquanto estiver em aberto.', 'ok');
      await refreshAll();
    } catch (err) {
      setMsg($('#empMsg'), err.message, 'err');
    }
  });

  $('#btnAlterarEmp')?.addEventListener('click', async () => {
    setMsg($('#empMsg'), 'Salvando alterações...');
    try {
      const emprestimo_id = state.selectedEmprestimoId;
      if (!emprestimo_id) throw new Error('Nenhum empréstimo em aberto selecionado');
      const quantidade = Number($('#empQuantidade').value || 1);
      const nome_solicitante = ($('#empNomeSolic').value || '').trim();
      const celular = ($('#empCelular').value || '').trim();
      const data_retirada = $('#empDataRetirada').value || null;
      const data_prevista_devolucao = $('#empPrevDevol').value || null;
      const observacao = $('#empObs').value || null;

      if (!nome_solicitante) throw new Error('Informe o nome do solicitante');
      if (!celular) throw new Error('Informe o celular');

      await apiFetch(`/api/emprestimos/${emprestimo_id}`, {
        method:'PUT',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ quantidade, nome_solicitante, celular, data_retirada, data_prevista_devolucao, observacao })
      });

      setMsg($('#empMsg'), 'Dados atualizados.', 'ok');
      await refreshAll();
    } catch (err) {
      setMsg($('#empMsg'), err.message, 'err');
    }
  });

  $('#btnToggleEquip')?.addEventListener('click', async () => {
    if (!state.selectedEquipId) return;
    try {
      const row = await apiFetch(`/api/equipamentos/${state.selectedEquipId}/toggle`, { method:'PUT' });
      // Atualiza estado local
      state.equipamentos = state.equipamentos.map(x => x.id === row.id ? row : x);
      renderEquipTable();
      renderEquipDetail(row);
    } catch (err) {
      alert(err.message);
    }
  });

  $('#btnSalvarCategoria')?.addEventListener('click', async () => {
    setMsg($('#catMsg'), 'Salvando...');
    try {
      const nome = $('#catNome').value.trim();
      if (!nome) throw new Error('Informe um nome');
      await apiFetch('/api/categorias', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ nome })
      });
      $('#catNome').value = '';
      setMsg($('#catMsg'), 'Salva.', 'ok');
      await loadCategorias();
    } catch (err) {
      setMsg($('#catMsg'), err.message, 'err');
    }
  });

  $('#btnNovoEquip')?.addEventListener('click', () => openModal('#modalEquip', true));

  $('#btnNovaCategoria')?.addEventListener('click', async () => {
    showTab('categorias');
    await loadCategorias();
    $('#catNome')?.focus();
  });
  $('#closeModalEquip')?.addEventListener('click', () => openModal('#modalEquip', false));
  $('#closeModalImgs')?.addEventListener('click', () => openModal('#modalAddImgs', false));
  $('#closeModalEditEquip')?.addEventListener('click', () => openModal('#modalEditEquip', false));

  $('#frmNovoEquip')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg($('#equipMsg'), 'Cadastrando...');
    try {
      const form = e.target;
      const fd = new FormData(form);
      if (!fd.get('categoria_id')) fd.delete('categoria_id');

      const res = await fetch(API('/api/equipamentos'), {
        method:'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: fd
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Erro ao cadastrar');

      setMsg($('#equipMsg'), 'Cadastrado com sucesso.', 'ok');
      form.reset();
      openModal('#modalEquip', false);
      await refreshAll();
      await selectEquip(out.id);
    } catch (err) {
      setMsg($('#equipMsg'), err.message, 'err');
    }
  });


  $('#frmEditEquip')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg($('#editEquipMsg'), 'Salvando...');
    try {
      const id = state.editingEquipId;
      if (!id) throw new Error('Nenhum equipamento selecionado para edição');

      const nome = ($('#editNome').value || '').trim();
      const categoriaRaw = ($('#selCatEdit').value || '').trim();
      const categoria_id = categoriaRaw ? Number(categoriaRaw) : null;
      const patrimonio = $('#editPatrimonio').value ?? '';
      const localizacao = $('#editLocalizacao').value ?? '';
      const status = $('#editStatus').value || 'DISPONIVEL';
      const quantidade_total = Number($('#editQtdTotal').value || 1);
      const quantidade_disponivel = Number($('#editQtdDisp').value || 0);
      const descricao = $('#editDescricao').value ?? '';

      if (!nome) throw new Error('Informe o nome');
      if (!categoria_id) throw new Error('Informe a categoria');

      await apiFetch(`/api/equipamentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, categoria_id, patrimonio, localizacao, status, quantidade_total, quantidade_disponivel, descricao })
      });

      setMsg($('#editEquipMsg'), 'Alterações salvas.', 'ok');
      openModal('#modalEditEquip', false);
      await refreshAll();
      await selectEquip(id);
    } catch (err) {
      setMsg($('#editEquipMsg'), err.message, 'err');
    }
  });

  $('#btnAddImgs')?.addEventListener('click', () => {
    if (!state.selectedEquipId) return;
    setMsg($('#addImgsMsg'), '');
    $('#addImgsInput').value = '';
    openModal('#modalAddImgs', true);
  });

  $('#frmAddImgs')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg($('#addImgsMsg'), 'Enviando...');
    try {
      const equipamento_id = state.selectedEquipId;
      if (!equipamento_id) throw new Error('Selecione um equipamento');
      const fd = new FormData();
      const files = $('#addImgsInput').files;
      for (const f of files) fd.append('imagens', f);

      const res = await fetch(API(`/api/equipamentos/${equipamento_id}/imagens`), {
        method:'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: fd
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'Erro ao enviar imagens');
      setMsg($('#addImgsMsg'), 'Imagens adicionadas.', 'ok');
      openModal('#modalAddImgs', false);
      await loadEquipamentos();
      await selectEquip(equipamento_id);
    } catch (err) {
      setMsg($('#addImgsMsg'), err.message, 'err');
    }
  });

  $('#btnDelEquip')?.addEventListener('click', () => {
    // Botão "Sair": deixa a aba Equipamentos e volta para Empréstimos
    state.selectedEquipId = null;
    renderEquipDetail(null);
    showTab('emprestimos');
  });

  await refreshAll();
  initBorrowTicker();
  showTab('equipamentos');
}

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initApp();
});
