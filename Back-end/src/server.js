const { createDatabase, createInitialAdmin } = require('./database');
const { hashPassword, createAuthenticate, requireSupervisor, registerLoginRoute, registerUserRoutes } = require('./auth');
const registerSectorRoutes = require('./routes/sectors');
const registerMachineRoutes = require('./routes/machines');
const registerOccurrenceRoutes = require('./routes/occurrences');
const registerInventoryRoutes = require('./routes/inventory');
const registerRentalRoutes = require('./routes/rentals');

const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const path = require('node:path');

const app = express();
app.use(express.json());

const FRONTEND_URL = process.env.FRONTEND_URL;
const allowedOrigins = new Set(
    [FRONTEND_URL, 'http://localhost', 'http://127.0.0.1']
        .filter(Boolean)
);

app.use(cors({
    origin(origin, callback) {
        // Requests without an Origin header (for example, curl) are allowed.
        if (!origin) {
            return callback(null, true);
        }

        let isLocalOrigin = false;
        try {
            const url = new URL(origin);
            isLocalOrigin =
                (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
                (url.protocol === 'http:' || url.protocol === 'https:');
        } catch {
            isLocalOrigin = false;
        }

        if (allowedOrigins.has(origin) || isLocalOrigin) {
            return callback(null, true);
        }

        return callback(new Error('Origem não autorizada pelo CORS.'));
    }
}));
const PORT = process.env.PORT || 3000;
const AUTH_SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.AUTH_SECRET) {
    console.warn('AUTH_SECRET não definido; sessões serão invalidadas quando o servidor reiniciar.');
}
const { prisma } = createDatabase();

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', mensagem: 'API rodando' });
});

const frontendRoot = path.resolve(__dirname, '..', '..');
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendRoot, 'index.html'));
});
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(frontendRoot, 'index.html'));
});
app.get('/apresentacao.html', (req, res) => {
    res.sendFile(path.join(frontendRoot, 'apresentacao.html'));
});
app.use('/css', express.static(path.join(frontendRoot, 'css'), { index: false }));
app.use('/js', express.static(path.join(frontendRoot, 'js'), { index: false }));
app.use('/pages', express.static(path.join(frontendRoot, 'pages'), { index: false }));
registerLoginRoute(app, { prisma, authSecret: AUTH_SECRET });
app.use(createAuthenticate(prisma, AUTH_SECRET));
registerUserRoutes(app, { prisma });
registerSectorRoutes(app, { prisma, requireSupervisor });
registerMachineRoutes(app, { prisma, requireSupervisor });
registerOccurrenceRoutes(app, { prisma, requireSupervisor });
registerInventoryRoutes(app, { prisma, requireSupervisor });
registerRentalRoutes(app, { prisma, requireSupervisor });

// ROTA 404 (Coringa)
// ==========================================
app.use((req, res) => {
    res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});
async function startServer() {
    try {
        await prisma.$connect();
        await createInitialAdmin(prisma, hashPassword);
        console.log('✅ Conectado ao banco de dados com sucesso!');
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

module.exports = { app, prisma, startServer };
