const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

function createDatabase() {
    const adapter = new PrismaMariaDb({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'factorytrack_db',
        port: Number(process.env.DB_PORT || 3306)
    });
    const prisma = new PrismaClient({ adapter });
    return { prisma };
}

async function createInitialAdmin(prisma, hashPassword) {
    const existingUsers = await prisma.usuario.count();
    const { INITIAL_ADMIN_NAME, INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_PASSWORD } = process.env;
    if (existingUsers > 0) return;
    if (!INITIAL_ADMIN_NAME && !INITIAL_ADMIN_USERNAME && !INITIAL_ADMIN_PASSWORD) {
        throw new Error('Não há contas cadastradas. Configure INITIAL_ADMIN_NAME, INITIAL_ADMIN_USERNAME e INITIAL_ADMIN_PASSWORD para criar o primeiro Chefe Geral.');
    }
    const nome = INITIAL_ADMIN_NAME?.trim() || '';
    const username = INITIAL_ADMIN_USERNAME?.trim().toLowerCase() || '';
    if (!nome || !username || !INITIAL_ADMIN_PASSWORD || nome.length > 100 || username.length > 100 || INITIAL_ADMIN_PASSWORD.length < 8 || INITIAL_ADMIN_PASSWORD.length > 256) {
        throw new Error('Configure nome e usuário inicial com até 100 caracteres e senha entre 8 e 256 caracteres.');
    }
    await prisma.usuario.create({
        data: {
            nome,
            usuario: username,
            senha: await hashPassword(INITIAL_ADMIN_PASSWORD),
            cargo: 'chefe_geral',
            ativo: true
        }
    });
    console.log(`Conta inicial de chefe criada para "${username}". Remova as variáveis INITIAL_ADMIN_* após o primeiro acesso.`);
}

module.exports = { createDatabase, createInitialAdmin };
