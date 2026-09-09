// Configuração do Prisma CLI (Prisma 7+).
// A partir da versão 7, a URL do banco não fica mais dentro do
// schema.prisma — ela vem daqui. Esse arquivo é lido pelo `npx prisma ...`
// (migrate, generate, studio etc.), não pelo servidor em si.

require('dotenv').config();
const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
