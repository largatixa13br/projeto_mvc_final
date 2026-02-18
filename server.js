require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { router: authRoutes } = require('./controle/authRoutes');
const { router: usuarioRoutes } = require('./controle/usuarioRoutes');
const { router: categoriaRoutes } = require('./controle/categoriaRoutes');
const { router: equipamentoRoutes } = require('./controle/equipamentoRoutes');
const { router: emprestimoRoutes } = require('./controle/emprestimoRoutes');

const app = express();

app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Front-end
app.use('/', express.static(path.join(__dirname, 'visualizacao'), { index: false }));

// Uploads (imagens)
app.use('/uploads', express.static(path.join(__dirname, 'visualizacao', 'imagens', 'uploads')));

// Rotas principais (primeira tela: login)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'visualizacao', 'login.html')));
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'visualizacao', 'index.html')));


// API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/equipamentos', equipamentoRoutes);
app.use('/api/emprestimos', emprestimoRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));