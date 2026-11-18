const { ocorrencias } = require('../mocks/dados');

// GET /ocorrencias
function listar(req, res) {
    return res.status(200).json(ocorrencias);
}

// POST /cadastrar-ocorrencia
function criar(req, res) {
    return res.status(201).json({ id: 3, mensagem: 'Registrado com sucesso!' });
}

// PUT /resolver-ocorrencia/:id
function resolver(req, res) {
    return res.status(200).json({ mensagem: 'Ocorrência marcada como resolvida!' });
}

// DELETE /ocorrencias/:id
function deletar(req, res) {
    return res.status(200).json({ mensagem: 'Ocorrência excluída com sucesso!' });
}

module.exports = { listar, criar, resolver, deletar };
