const express = require('express');
const routes = require('./routes');

const app = express();
app.use(express.json());
app.use(routes);

// JSON mal formatado no corpo da requisição
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
    }
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno.' });
});

// ROTA 404 (Coringa)
app.use((req, res) => {
    res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

// Porta 3333 para não conflitar com o sistema real (3000)
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
    console.log(`API de mocks rodando em http://localhost:${PORT}`);
});
