const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);

function normalizeRole(role) {
    const normalized = String(role || '').toLowerCase();
    if (['chefe_geral', 'administrador', 'admin'].includes(normalized)) return 'chefe_geral';
    if (['gerente', 'supervisor'].includes(normalized)) return 'gerente';
    return 'operador';
}

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await scrypt(password, salt, 64);
    return `scrypt:${salt}:${hash.toString('hex')}`;
}

async function verifyPassword(password, storedPassword) {
    if (storedPassword.startsWith('scrypt:')) {
        const [, salt, expectedHex] = storedPassword.split(':');
        const expected = Buffer.from(expectedHex || '', 'hex');
        if (expected.length !== 64 || !salt) return false;
        const actual = await scrypt(password, salt, expected.length);
        return crypto.timingSafeEqual(expected, actual);
    }
    const supplied = Buffer.from(password);
    const expected = Buffer.from(storedPassword);
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function createToken(user, authSecret) {
    const payload = Buffer.from(JSON.stringify({
        id: user.id,
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', authSecret).update(payload).digest('base64url');
    return payload + '.' + signature;
}

function readToken(token, authSecret) {
    const parts = String(token || '').split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    const [payload, signature] = parts;
    const expected = crypto.createHmac('sha256', authSecret).update(payload).digest();
    let actual;
    try {
        actual = Buffer.from(signature, 'base64url');
    } catch {
        return null;
    }
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (!Number.isInteger(data.id) || data.exp <= Math.floor(Date.now() / 1000)) return null;
        return data;
    } catch {
        return null;
    }
}

function createAuthenticate(prisma, authSecret) {
    return async function authenticate(req, res, next) {
        const authorization = req.get('authorization') || '';
        const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
        const tokenData = readToken(token, authSecret);
        if (!tokenData) return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });

        try {
            const user = await prisma.usuario.findUnique({ where: { id: tokenData.id } });
            if (!user || !user.ativo) return res.status(401).json({ erro: 'Conta inativa ou inexistente.' });
            req.user = {
                id: user.id,
                nome: user.nome || user.usuario,
                usuario: user.usuario,
                cargo: normalizeRole(user.cargo || user.tipo)
            };
            next();
        } catch (err) {
            console.error('Erro ao validar sessão:', err.message);
            res.status(500).json({ erro: 'Erro ao validar sessão.' });
        }
    };
}

function requireSupervisor(req, res, next) {
    if (!['chefe_geral', 'gerente'].includes(req.user.cargo)) {
        return res.status(403).json({ erro: 'Acesso permitido somente à chefia.' });
    }
    next();
}

function requireChief(req, res, next) {
    if (req.user.cargo !== 'chefe_geral') {
        return res.status(403).json({ erro: 'Somente o Chefe Geral pode gerenciar contas.' });
    }
    next();
}

async function countActiveChiefs(prisma) {
    const users = await prisma.usuario.findMany({
        where: { ativo: true },
        select: { cargo: true, tipo: true }
    });
    return users.filter(user => normalizeRole(user.cargo || user.tipo) === 'chefe_geral').length;
}

// Limite simples de tentativas de login por IP, em memória.
// Freia força bruta sem depender de biblioteca externa. Observação: em
// ambiente serverless (Vercel) a contagem é por instância, então serve
// como primeira barreira, não como proteção absoluta.
const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map();

function loginRateLimit(req, res, next) {
    const now = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || 'desconhecido';

    // Limpeza preguiçosa para o Map não crescer sem limite.
    if (loginAttempts.size > 5000) {
        for (const [chave, dados] of loginAttempts) {
            if (now > dados.reset) loginAttempts.delete(chave);
        }
    }

    const entry = loginAttempts.get(ip);
    if (!entry || now > entry.reset) {
        loginAttempts.set(ip, { count: 1, reset: now + LOGIN_WINDOW_MS });
        return next();
    }

    entry.count += 1;
    if (entry.count > LOGIN_MAX_ATTEMPTS) {
        const retry = Math.ceil((entry.reset - now) / 1000);
        res.set('Retry-After', String(retry));
        return res.status(429).json({ erro: `Muitas tentativas de login. Tente novamente em ${retry} segundos.` });
    }
    next();
}

function registerLoginRoute(app, { prisma, authSecret }) {
    // rota de login
    app.post('/login', loginRateLimit, async (req, res) => {
        const loginInput = typeof req.body.usuario === 'string' ? req.body.usuario.trim().toLowerCase() : '';
        const senhaInput = typeof req.body.senha === 'string' ? req.body.senha : '';
        if (!loginInput || !senhaInput) {
            return res.status(400).json({ erro: 'Usuário e senha são obrigatórios.' });
        }

        try {
            const user = await prisma.usuario.findUnique({ where: { usuario: loginInput } });
            if (!user || !user.ativo || !(await verifyPassword(senhaInput, user.senha))) {
                return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
            }

            const cargo = normalizeRole(user.cargo || user.tipo);
            if (!user.senha.startsWith('scrypt:') || user.cargo !== cargo) {
                await prisma.usuario.update({
                    where: { id: user.id },
                    data: {
                        senha: user.senha.startsWith('scrypt:') ? user.senha : await hashPassword(senhaInput),
                        cargo
                    }
                });
            }
            const usuario = { id: user.id, nome: user.nome || user.usuario, usuario: user.usuario, cargo };
            return res.json({ sucesso: true, token: createToken(usuario, authSecret), usuario });
        } catch (err) {
            console.error('Erro no banco durante o login:', err.message);
            return res.status(500).json({ erro: 'Erro interno no servidor de banco de dados.' });
        }
    });
}

function registerUserRoutes(app, { prisma }) {
    app.get('/me', (req, res) => res.json({ usuario: req.user }));

    app.get('/usuarios', requireChief, async (req, res) => {
        try {
            const usuarios = await prisma.usuario.findMany({
                orderBy: { nome: 'asc' },
                select: { id: true, nome: true, usuario: true, cargo: true, ativo: true }
            });
            res.json(usuarios.map(user => ({ ...user, cargo: normalizeRole(user.cargo) })));
        } catch (err) {
            console.error('Erro ao listar usuários:', err.message);
            res.status(500).json({ erro: 'Erro ao listar usuários.' });
        }
    });

    app.post('/usuarios', requireChief, async (req, res) => {
        const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
        const usuario = typeof req.body.usuario === 'string' ? req.body.usuario.trim().toLowerCase() : '';
        const senha = typeof req.body.senha === 'string' ? req.body.senha : '';
        const cargo = req.body.cargo;
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuario);
        if (!nome || nome.length > 100 || !emailValido || usuario.length > 100 || senha.length < 8 || senha.length > 256 || !['operador', 'gerente', 'chefe_geral'].includes(cargo)) {
            return res.status(400).json({ erro: 'Informe nome, e-mail corporativo válido, senha de 8 a 256 caracteres e um cargo válido.' });
        }

        try {
            const novoUsuario = await prisma.usuario.create({
                data: { nome, usuario, senha: await hashPassword(senha), cargo, ativo: true },
                select: { id: true, nome: true, usuario: true, cargo: true, ativo: true }
            });
            res.status(201).json(novoUsuario);
        } catch (err) {
            if (err.code === 'P2002') return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });
            console.error('Erro ao cadastrar usuário:', err.message);
            res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
        }
    });

    app.put('/usuarios/:id/status', requireChief, async (req, res) => {
        const id = Number(req.params.id);
        const ativo = req.body.ativo;
        if (!Number.isInteger(id) || typeof ativo !== 'boolean') {
            return res.status(400).json({ erro: 'Identificador ou status inválido.' });
        }
        if (id === req.user.id && !ativo) {
            return res.status(400).json({ erro: 'Não é possível desativar a própria conta.' });
        }

        try {
            const target = await prisma.usuario.findUnique({ where: { id } });
            if (!target) return res.status(404).json({ erro: 'Usuário não encontrado.' });
            if (!ativo && normalizeRole(target.cargo || target.tipo) === 'chefe_geral') {
                const chiefs = await countActiveChiefs(prisma);
                if (chiefs <= 1) return res.status(409).json({ erro: 'Não é possível desativar o último chefe ativo.' });
            }
            await prisma.usuario.update({ where: { id }, data: { ativo } });
            res.json({ mensagem: ativo ? 'Conta ativada.' : 'Conta desativada.' });
        } catch (err) {
            console.error('Erro ao atualizar usuário:', err.message);
            res.status(500).json({ erro: 'Erro ao atualizar usuário.' });
        }
    });

    app.put('/usuarios/:id/cargo', requireChief, async (req, res) => {
        const id = Number(req.params.id);
        const cargo = req.body.cargo;
        if (!Number.isInteger(id) || !['operador', 'gerente', 'chefe_geral'].includes(cargo)) {
            return res.status(400).json({ erro: 'Identificador ou cargo inválido.' });
        }
        if (id === req.user.id && cargo !== 'chefe_geral') {
            return res.status(400).json({ erro: 'Não é possível remover o próprio cargo de Chefe Geral.' });
        }

        try {
            const target = await prisma.usuario.findUnique({ where: { id } });
            if (!target) return res.status(404).json({ erro: 'Usuário não encontrado.' });
            if (cargo !== 'chefe_geral' && normalizeRole(target.cargo || target.tipo) === 'chefe_geral' && target.ativo) {
                const chiefs = await countActiveChiefs(prisma);
                if (chiefs <= 1) return res.status(409).json({ erro: 'Não é possível remover o cargo do último chefe ativo.' });
            }
            await prisma.usuario.update({ where: { id }, data: { cargo, tipo: null } });
            res.json({ mensagem: 'Cargo atualizado.' });
        } catch (err) {
            console.error('Erro ao atualizar cargo do usuário:', err.message);
            res.status(500).json({ erro: 'Erro ao atualizar cargo.' });
        }
    });


    // ==========================================
}

module.exports = {
    normalizeRole,
    hashPassword,
    countActiveChiefs,
    createAuthenticate,
    requireSupervisor,
    requireChief,
    registerLoginRoute,
    registerUserRoutes
};
