const { pecas } = require('../mocks/dados');

// GET /pecas
function listar(req, res) {
    return res.status(200).json(pecas);
}

// POST /cadastrar-peca
function criar(req, res) {
    const { nome, categoria, qtd, min, unidade } = req.validado.body;
    return res.status(201).json({ id: 4, nome, categoria, qtd, min, unidade });
}

// PUT /atualizar-peca/:id
function atualizar(req, res) {
    return res.status(200).json({ mensagem: 'Estoque atualizado!' });
}

// DELETE /deletar-peca/:id
function deletar(req, res) {
    return res.status(200).json({ mensagem: 'Peça deletada!' });
}

module.exports = { listar, criar, atualizar, deletar };
