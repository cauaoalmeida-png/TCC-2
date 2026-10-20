// Função da Vercel: recebe as rotas da API e repassa para o Express.
// Os arquivos do site (index.html, css/, js/, pages/) são servidos
// direto pela Vercel; só o que não for arquivo cai aqui (ver vercel.json).

const { app, ready } = require('../Back-end/src/server');

module.exports = async (req, res) => {
    try {
        await ready();
    } catch (err) {
        console.error('❌ Erro ao conectar/configurar o Banco de Dados:', err.message);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.end(JSON.stringify({ erro: 'Banco de dados indisponível.' }));
    }
    return app(req, res);
};
