// FactoryTrack - Back-end (Node.js + Express + Prisma + MySQL)

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { PrismaClient } = require('@prisma/client');

const app = express();
app.use(express.json());

const FRONTEND_URL = process.env.FRONTEND_URL;
app.use(cors({
    origin: FRONTEND_URL || '*'
}));

const PORT = process.env.PORT || 3000;

// conexão com Banco de Dados (MySQL) via Prisma
const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

(async () => {
    try {
        await prisma.$connect();
        console.log('conectado ao banco de dados');
    } catch (err) {
        console.error('error ao conectar no Banco de Dados', err.message);
    }
})();

// rota de teste
app.get('/', (req, res) => {
    res.json({ status: 'ok', mensagem: 'API rodando' });
});

// rota de login
app.post('/login', async (req, res) => {
    const loginInput = req.body.usuario || req.body.nome || req.body.email;
    const senhaInput = req.body.senha;

    console.log(` Tentativa de login recebida para: "${loginInput}"`);

    if (!loginInput || !senhaInput) {
        return res.status(400).json({ erro: 'Usuário e senha são obrigatórios.' });
    }

    try {
        // Busca na tabela 'usuarios' por nome ou usuario com a senha digitada
        const user = await prisma.usuario.findFirst({
            where: {
                senha: senhaInput,
                OR: [
                    { usuario: loginInput },
                    { nome: loginInput }
                ]
            }
        });

        if (user) {
            console.log(`✅ Login APROVADO para o usuário: ${user.nome || user.usuario}`);

            return res.json({
                sucesso: true,
                mensagem: 'Login efetuado com sucesso!',
                usuario: {
                    id: user.id,
                    nome: user.nome || user.usuario,
                    cargo: user.cargo || user.tipo || 'operador'
                }
            });
        } else {
            console.log(` Login RECUSADO para: "${loginInput}" (Credenciais inválidas)`);
            return res.status(401).json({ erro: 'Nome ou senha incorretos.' });
        }
    } catch (err) {
        console.error(' Erro no banco durante o login:', err.message);
        return res.status(500).json({ erro: 'Erro interno no servidor de banco de dados.' });
    }
});


// ==========================================
// ROTAS DE SETORES
// ==========================================

// Cadastrar setor
app.post('/cadastrar-setor', async (req, res) => {
    const { nome_setor, responsavel } = req.body;

    if (!nome_setor || !responsavel) {
        return res.status(400).json({ erro: 'nome_setor e responsavel são obrigatórios.' });
    }

    try {
        const novoSetor = await prisma.setor.create({
            data: { nomeSetor: nome_setor, responsavel }
        });
        res.status(201).json({ id: novoSetor.id, nome_setor, responsavel });
    } catch (err) {
        console.error(' Erro ao cadastrar setor:', err.message);
        res.status(500).json({ erro: 'Erro ao cadastrar setor.' });
    }
});

// Buscar todos os setores
app.get('/setores', async (req, res) => {
    try {
        const setores = await prisma.setor.findMany({ orderBy: { id: 'asc' } });
        const results = setores.map(s => ({
            id: s.id,
            nome_setor: s.nomeSetor,
            responsavel: s.responsavel,
            criado_em: s.criadoEm
        }));
        res.status(200).json(results);
    } catch (err) {
        console.error(' Erro ao buscar setores:', err.message);
        res.status(500).json({ erro: 'Erro ao buscar setores.' });
    }
});

// Deletar setor
app.delete('/deletar-setor/:id', async (req, res) => {
    try {
        await prisma.setor.delete({ where: { id: Number(req.params.id) } });
        res.status(200).json({ mensagem: 'Setor deletado com sucesso!' });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ erro: 'Setor não encontrado.' });
        }
        console.error(' Erro ao deletar setor:', err.message);
        res.status(500).json({ erro: 'Erro ao deletar setor no banco de dados.' });
    }
});


// ==========================================
// ROTAS DE MÁQUINAS
// ==========================================

// Cadastrar máquina
app.post('/cadastrar-maquina', async (req, res) => {
    const { nome_maquina, setor_associado, numero_serie } = req.body;

    if (!nome_maquina || !setor_associado) {
        return res.status(400).json({ erro: 'nome_maquina e setor_associado são obrigatórios.' });
    }

    try {
        const novaMaquina = await prisma.maquina.create({
            data: {
                nomeMaquina: nome_maquina,
                setorAssociado: setor_associado,
                numeroSerie: numero_serie || null
            }
        });
        res.status(201).json({ id: novaMaquina.id, nome_maquina, setor_associado, numero_serie });
    } catch (err) {
        console.error(' Erro ao cadastrar máquina:', err.message);
        res.status(500).json({ erro: 'Erro ao cadastrar máquina.' });
    }
});

// Buscar todas as máquinas
app.get('/maquinas', async (req, res) => {
    try {
        const maquinas = await prisma.maquina.findMany({ orderBy: { id: 'asc' } });
        const results = maquinas.map(m => ({
            id: m.id,
            nome_maquina: m.nomeMaquina,
            setor_associado: m.setorAssociado,
            numero_serie: m.numeroSerie,
            criado_em: m.criadoEm
        }));
        res.status(200).json(results);
    } catch (err) {
        console.error(' Erro ao buscar máquinas:', err.message);
        res.status(500).json({ erro: 'Erro ao buscar máquinas.' });
    }
});

// Deletar máquina
app.delete('/deletar-maquina/:id', async (req, res) => {
    try {
        await prisma.maquina.delete({ where: { id: Number(req.params.id) } });
        res.status(200).json({ mensagem: 'Máquina deletada com sucesso!' });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ erro: 'Máquina não encontrada.' });
        }
        console.error(' Erro ao deletar máquina:', err.message);
        res.status(500).json({ erro: 'Erro ao deletar máquina.' });
    }
});


// ==========================================
// ROTAS DE OCORRÊNCIAS
// ==========================================

// Cadastrar nova ocorrência
app.post('/cadastrar-ocorrencia', async (req, res) => {
    const { data, setor, maquina, tipo, operador, turno, descricao, status, resolucao, itensChecklist } = req.body;

    if (!setor || !maquina || !tipo || !operador || !turno) {
        return res.status(400).json({ erro: 'setor, maquina, tipo, operador e turno são obrigatórios.' });
    }

    const itensString = itensChecklist ? JSON.stringify(itensChecklist) : null;
    const dataOcorrencia = data ? new Date(data) : new Date();

    try {
        const nova = await prisma.ocorrencia.create({
            data: {
                data: dataOcorrencia,
                setor,
                maquina,
                tipo,
                operador,
                turno,
                descricao: descricao || '',
                status: status || 'Pendente',
                resolucao: resolucao || '',
                itensChecklist: itensString
            }
        });
        res.status(201).json({ id: nova.id, mensagem: 'Registrado com sucesso!' });
    } catch (err) {
        console.error(' Erro ao registrar ocorrência:', err.message);
        res.status(500).json({ erro: 'Erro ao registrar ocorrência.' });
    }
});

// Buscar todas as ocorrências
app.get('/ocorrencias', async (req, res) => {
    try {
        const results = await prisma.ocorrencia.findMany({ orderBy: { data: 'desc' } });

        const ocorrencias = results.map(o => ({
            ...o,
            itensChecklist: o.itensChecklist ? JSON.parse(o.itensChecklist) : null
        }));

        res.status(200).json(ocorrencias);
    } catch (err) {
        console.error(' Erro ao buscar ocorrências:', err.message);
        res.status(500).json({ erro: 'Erro ao buscar ocorrências.' });
    }
});

// Marcar ocorrência como resolvida
app.put('/resolver-ocorrencia/:id', async (req, res) => {
    const { id } = req.params;
    const { resolucao, dataResolucao } = req.body;

    if (!resolucao) {
        return res.status(400).json({ erro: 'O campo resolucao é obrigatório.' });
    }

    try {
        await prisma.ocorrencia.update({
            where: { id: Number(id) },
            data: {
                status: 'Resolvido',
                resolucao,
                dataResolucao: dataResolucao ? new Date(dataResolucao) : new Date()
            }
        });
        res.status(200).json({ mensagem: 'Ocorrência marcada como resolvida!' });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ erro: 'Ocorrência não encontrada.' });
        }
        console.error(' Erro ao resolver ocorrência:', err.message);
        res.status(500).json({ erro: 'Erro ao resolver ocorrência.' });
    }
});

// Deletar ocorrência
app.delete('/ocorrencias/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.ocorrencia.delete({ where: { id: Number(id) } });
        res.json({ mensagem: 'Ocorrência excluída com sucesso!' });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ erro: 'Ocorrência não encontrada.' });
        }
        console.error(' Erro ao excluir ocorrência:', err.message);
        res.status(500).json({ erro: 'Erro ao excluir no banco de dados.' });
    }
});


// ==========================================
// ROTAS DE ESTOQUE (Peças)
// ==========================================

// Buscar peças
app.get('/pecas', async (req, res) => {
    try {
        const results = await prisma.peca.findMany({ orderBy: { id: 'asc' } });
        res.status(200).json(results);
    } catch (err) {
        console.error(' Erro ao buscar estoque:', err.message);
        res.status(500).json({ erro: 'Erro ao buscar estoque.' });
    }
});

// Cadastrar peça
app.post('/cadastrar-peca', async (req, res) => {
    const { nome, categoria, qtd, min, unidade } = req.body;

    if (!nome || qtd === undefined || min === undefined) {
        return res.status(400).json({ erro: 'nome, qtd e min são obrigatórios.' });
    }

    try {
        const nova = await prisma.peca.create({
            data: { nome, categoria: categoria || null, qtd, min, unidade: unidade || null }
        });
        res.status(201).json({ id: nova.id, nome, categoria, qtd, min, unidade });
    } catch (err) {
        console.error(' Erro ao cadastrar peça:', err.message);
        res.status(500).json({ erro: 'Erro ao cadastrar peça.' });
    }
});

// Atualizar peça
app.put('/atualizar-peca/:id', async (req, res) => {
    const { id } = req.params;
    const { qtd } = req.body;

    if (qtd === undefined || isNaN(qtd) || qtd < 0) {
        return res.status(400).json({ erro: 'qtd inválida.' });
    }

    try {
        await prisma.peca.update({
            where: { id: Number(id) },
            data: { qtd: Number(qtd) }
        });
        res.status(200).json({ mensagem: 'Estoque atualizado!' });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ erro: 'Peça não encontrada.' });
        }
        console.error(' Erro ao atualizar quantidade:', err.message);
        res.status(500).json({ erro: 'Erro ao atualizar quantidade.' });
    }
});

// Deletar peça
app.delete('/deletar-peca/:id', async (req, res) => {
    try {
        await prisma.peca.delete({ where: { id: Number(req.params.id) } });
        res.status(200).json({ mensagem: 'Peça deletada!' });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ erro: 'Peça não encontrada.' });
        }
        console.error(' Erro ao deletar peça:', err.message);
        res.status(500).json({ erro: 'Erro ao deletar peça.' });
    }
});


// ==========================================
// ROTA 404 (Coringa)
// ==========================================
app.use((req, res) => {
    res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

app.listen(PORT, () => {
    console.log(` Servidor rodando em http://localhost:${PORT}`);
});
