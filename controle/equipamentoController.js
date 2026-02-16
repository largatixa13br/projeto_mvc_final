const path = require('path');
const fs = require('fs');
const multer = require('multer');
const EquipamentoModel = require('../Modelo/equipamentoModel');

const uploadDir = path.join(__dirname, '..', 'visualizacao', 'imagens', 'uploads', 'equipamentos');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_');
    const unique = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${safe}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.mimetype);
    if (!ok) return cb(new Error('Tipo de arquivo não permitido'));
    cb(null, true);
  }
});

async function list(req, res) {
  try {
    const includeInativos = req.user?.perfil === 'ADMIN';
    const rows = await EquipamentoModel.list({ includeInativos });
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao listar equipamentos' });
  }
}

async function get(req, res) {
  try {
    const includeInativos = req.user?.perfil === 'ADMIN';
    const row = await EquipamentoModel.get(Number(req.params.id), { includeInativos });
    if (!row) return res.status(404).json({ error: 'Equipamento não encontrado' });
    return res.json(row);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao obter equipamento' });
  }
}

async function create(req, res) {
  try {
    const id = await EquipamentoModel.create(req.body, req.files || []);
    const row = await EquipamentoModel.get(id, { includeInativos: true });
    return res.status(201).json(row);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || 'Erro ao criar equipamento' });
  }
}

async function addImages(req, res) {
  try {
    const id = Number(req.params.id);
    await EquipamentoModel.addImages(id, req.files || []);
    const row = await EquipamentoModel.get(id, { includeInativos: true });
    return res.json(row);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || 'Erro ao adicionar imagens' });
  }
}

async function update(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await EquipamentoModel.update(id, req.body);
    return res.json(row);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao atualizar equipamento' });
  }
}

async function toggleAtivo(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await EquipamentoModel.toggleAtivo(id);
    return res.json(row);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao ativar/desativar equipamento' });
  }
}

async function remove(req, res) {
  try {
    await EquipamentoModel.remove(Number(req.params.id));
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao remover equipamento' });
  }
}

module.exports = { list, get, create, update, remove, addImages, toggleAtivo, upload };
