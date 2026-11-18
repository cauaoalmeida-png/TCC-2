const { usuarios } = require('../mocks/dados');

// POST /login
function login(req, res) {
    const { usuario } = req.validado.body;
    const encontrado = usuarios.find(u => u.usuario === usuario) || usuarios[0];
    return res.status(200).json({
        sucesso: true,
        token: 'token-falso-apenas-para-teste',
        usuario: { id: encontrado.id, nome: encontrado.nome, usuario: encontrado.usuario, cargo: encontrado.cargo }
    });
}

// GET /me
function me(req, res) {
    return res.status(200).json({ usuario: usuarios[0] });
}

// GET /usuarios
function listar(req, res) {
    return res.status(200).json(usuarios);
}

// POST /usuarios
function criar(req, res) {
    const { nome, usuario, cargo } = req.validado.body;
    // A senha nunca volta na resposta
    return res.status(201).json({ id: 4, nome, usuario, cargo, ativo: true });
}

// PUT /usuarios/:id/status
function alterarStatus(req, res) {
    const { ativo } = req.validado.body;
    return res.status(200).json({ mensagem: ativo ? 'Conta ativada.' : 'Conta desativada.' });
}

// PUT /usuarios/:id/cargo
function alterarCargo(req, res) {
    return res.status(200).json({ mensagem: 'Cargo atualizado.' });
}

module.exports = { login, me, listar, criar, alterarStatus, alterarCargo };
