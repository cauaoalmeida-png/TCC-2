const { maquinas } = require('../mocks/dados');

// GET /maquinas
function listar(req, res) {
    return res.status(200).json(maquinas);
}

// POST /cadastrar-maquina
function criar(req, res) {
    const { nome_maquina, setor_associado, numero_serie } = req.validado.body;
    return res.status(201).json({ id: 4, nome_maquina, setor_associado, numero_serie: numero_serie ?? null });
}

// DELETE /deletar-maquina/:id
function deletar(req, res) {
    return res.status(200).json({ mensagem: 'Máquina deletada com sucesso!' });
}

module.exports = { listar, criar, deletar };
