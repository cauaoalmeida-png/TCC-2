const { guindastes, alugueis } = require('../mocks/dados');

// GET /guindastes
function listar(req, res) {
    return res.status(200).json(guindastes);
}

// POST /cadastrar-guindaste
function criar(req, res) {
    const { modelo, identificacao } = req.validado.body;
    return res.status(201).json({ id: 3, modelo, identificacao: identificacao ?? null, status: 'Disponível' });
}

// DELETE /deletar-guindaste/:id
function deletar(req, res) {
    return res.status(200).json({ mensagem: 'Guindaste deletado com sucesso.' });
}

// GET /alugueis
function listarAlugueis(req, res) {
    return res.status(200).json(alugueis);
}

// POST /alugar-guindaste
function alugar(req, res) {
    const { guindasteId, cliente, dataPrevistaDevolucao } = req.validado.body;
    return res.status(201).json({
        id: 2,
        guindasteId,
        cliente,
        dataLocacao: '2026-10-28T10:00:00.000Z',
        dataPrevistaDevolucao: `${dataPrevistaDevolucao}T00:00:00.000Z`,
        dataDevolucaoReal: null,
        status: 'Ativo'
    });
}

// PUT /devolver-aluguel/:id
function devolver(req, res) {
    return res.status(200).json({ mensagem: 'Guindaste devolvido com sucesso.' });
}

module.exports = { listar, criar, deletar, listarAlugueis, alugar, devolver };
