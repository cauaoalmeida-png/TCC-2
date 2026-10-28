const { setores } = require('../mocks/dados');

// GET /setores
function listar(req, res) {
    return res.status(200).json(setores);
}

// POST /cadastrar-setor
function criar(req, res) {
    const { nome_setor, responsavel } = req.validado.body;
    return res.status(201).json({ id: 4, nome_setor, responsavel });
}

// DELETE /deletar-setor/:id
function deletar(req, res) {
    return res.status(200).json({ mensagem: 'Setor deletado com sucesso!' });
}

module.exports = { listar, criar, deletar };
