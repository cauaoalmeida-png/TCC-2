const { createDatabase, createInitialAdmin } = require('./database');
const { hashPassword, createAuthenticate, requireSupervisor, registerLoginRoute, registerUserRoutes } = require('./auth');
const registerSectorRoutes = require('./routes/sectors');
const registerMachineRoutes = require('./routes/machines');
const registerOccurrenceRoutes = require('./routes/occurrences');
const registerInventoryRoutes = require('./routes/inventory');
const registerRentalRoutes = require('./routes/rentals');
const registerAiRoutes = require('./routes/ai');

const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const path = require('node:path');
const PAGINA_404 = require('./pagina404');

const app = express();
// Atrás do proxy da Vercel: faz o req.ip refletir o cliente real
// (usado pelo limite de tentativas de login).
app.set('trust proxy', true);
// As rotas de IA que recebem foto ou nota fiscal aceitam corpo maior; as demais não.
const jsonPadrao = express.json();
const jsonComArquivo = express.json({ limit: '4mb' });
app.use((req, res, next) => (registerAiRoutes.ROTAS_COM_ARQUIVO.includes(req.path) ? jsonComArquivo : jsonPadrao)(req, res, next));

const FRONTEND_URL = process.env.FRONTEND_URL;
const allowedOrigins = new Set(
    [FRONTEND_URL, 'http://localhost', 'http://127.0.0.1']
        .filter(Boolean)
);

function isLocalOrigin(origin) {
    try {
        const url = new URL(origin);
        return (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
            (url.protocol === 'http:' || url.protocol === 'https:');
    } catch {
        return false;
    }
}

// O site e a API ficam no mesmo endereço (local ou na Vercel), então
// requisições vindas do próprio domínio sempre são aceitas.
function isSameOrigin(origin, req) {
    try {
        return new URL(origin).host === req.headers.host;
    } catch {
        return false;
    }
}

app.use(cors((req, callback) => {
    const origin = req.headers.origin;
    // Requests without an Origin header (for example, curl) are allowed.
    if (!origin || allowedOrigins.has(origin) || isLocalOrigin(origin) || isSameOrigin(origin, req)) {
        return callback(null, { origin: true });
    }
    return callback(new Error('Origem não autorizada pelo CORS.'));
}));
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
if (!process.env.AUTH_SECRET) {
    if (isProduction) {
        // Em produção um segredo aleatório por instância invalidaria os logins
        // de forma imprevisível. Melhor recusar a subir do que ficar instável.
        throw new Error('AUTH_SECRET não definido. Configure uma chave aleatória longa e persistente nas variáveis de ambiente antes de subir em produção.');
    }
    console.warn('AUTH_SECRET não definido; sessões serão invalidadas quando o servidor reiniciar. Use apenas em desenvolvimento.');
}
const AUTH_SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
const { prisma } = createDatabase();

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', mensagem: 'API rodando' });
});

const frontendRoot = path.resolve(__dirname, '..', '..');
// A raiz abre a apresentação; o login do sistema fica em /sistema.
app.get(['/', '/apresentacao.html'], (req, res) => {
    res.sendFile(path.join(frontendRoot, 'apresentacao.html'));
});
app.get(['/sistema', '/index.html'], (req, res) => {
    res.sendFile(path.join(frontendRoot, 'index.html'));
});
// Ícones da aba do navegador (só esses arquivos, para não expor a raiz e o .env)
app.get(['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png'], (req, res) => {
    res.sendFile(path.join(frontendRoot, req.path));
});
app.use('/css', express.static(path.join(frontendRoot, 'css'), { index: false }));
app.use('/js', express.static(path.join(frontendRoot, 'js'), { index: false }));
app.use('/pages', express.static(path.join(frontendRoot, 'pages'), { index: false }));
// Endereço que não existe aberto no navegador: mostra a página "não
// encontrada" (sem isso, caía na checagem de login e voltava 401 em branco).
// Os pedidos da API (fetch) não pedem HTML, então seguem o caminho normal;
// a API só funciona com o token, que o navegador não manda ao abrir um link.
app.use((req, res, next) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && req.accepts(['json', 'html']) === 'html') {
        return res.status(404).type('html').send(PAGINA_404);
    }
    next();
});
registerLoginRoute(app, { prisma, authSecret: AUTH_SECRET });
app.use(createAuthenticate(prisma, AUTH_SECRET));
registerUserRoutes(app, { prisma });
registerSectorRoutes(app, { prisma, requireSupervisor });
registerMachineRoutes(app, { prisma, requireSupervisor });
registerOccurrenceRoutes(app, { prisma, requireSupervisor });
registerInventoryRoutes(app, { prisma, requireSupervisor });
registerRentalRoutes(app, { prisma, requireSupervisor });
registerAiRoutes(app, { prisma, requireSupervisor });

// ROTA 404 (Coringa)
// ==========================================
app.use((req, res) => {
    if (req.accepts(['json', 'html']) === 'html') return res.status(404).type('html').send(PAGINA_404);
    res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});
// Conecta ao banco e cria a conta inicial uma única vez por processo.
// Usado tanto pelo `npm start` quanto pela função da Vercel (api/index.js).
let readyPromise;
function ready() {
    if (!readyPromise) {
        readyPromise = (async () => {
            await prisma.$connect();
            await createInitialAdmin(prisma, hashPassword);
            console.log('✅ Conectado ao banco de dados com sucesso!');
        })().catch((err) => {
            readyPromise = undefined;
            throw err;
        });
    }
    return readyPromise;
}

async function startServer() {
    try {
        await ready();
        app.listen(PORT, () => {
            console.log(`Servidor rodando em http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Erro ao conectar/configurar o Banco de Dados:', err.message);
        try {
            await prisma.$disconnect();
        } catch (disconnectError) {
            console.error('Erro ao fechar conexão com o banco:', disconnectError.message);
        }
        process.exitCode = 1;
    }
}

module.exports = { app, prisma, ready, startServer };
