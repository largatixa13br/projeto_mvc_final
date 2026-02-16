const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AuthModel = require('../Modelo/authModel');

function signToken(user) {
  return jwt.sign(
    { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

async function login(req, res) {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'Informe email e senha' });

    const user = await AuthModel.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(senha, user.senha_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = signToken(user);
    return res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro no login' });
  }
}

async function register(req, res) {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Informe nome, email e senha' });

    const exists = await AuthModel.findByEmail(email);
    if (exists) return res.status(409).json({ error: 'Email já cadastrado' });

    const senha_hash = await bcrypt.hash(senha, 10);
    const id = await AuthModel.createUser({ nome, email, senha_hash, perfil: 'USER' });
    const user = await AuthModel.findById(id);
    const token = signToken(user);
    return res.status(201).json({ token, user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao registrar' });
  }
}

async function me(req, res) {
  return res.json({ user: req.user });
}

module.exports = { login, register, me };
