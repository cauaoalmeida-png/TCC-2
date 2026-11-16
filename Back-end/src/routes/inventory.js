const { normalizarCategoria, normalizarUnidade } = require('../categorias');

function inteiro(valor) {
    const n = Number(valor);
    return Number.isInteger(n) ? n : NaN;
}

function registerRoutes(app, { prisma, requireSupervisor }) {
    // ROTAS DE ESTOQUE (Peças)
    // ==========================================

    // Buscar peças
    app.get('/pecas', async (req, res) => {
        try {
            const results = await prisma.peca.findMany({ orderBy: { id: 'asc' } });
            // Categoria fora da lista aparece como "Outro" (os dados antigos são
            // padronizados no deploy; isto cobre o que entrar por outro caminho).
            res.status(200).json(results.map(p => ({ ...p, categoria: normalizarCategoria(p.categoria) })));
        } catch (err) {
            console.error(' Erro ao buscar estoque:', err.message);
            res.status(500).json({ erro: 'Erro ao buscar estoque.' });
        }
    });

    // Cadastrar peça
    app.post('/cadastrar-peca', requireSupervisor, async (req, res) => {
        const nome = typeof req.body?.nome === 'string' ? req.body.nome.trim() : '';
        const qtd = inteiro(req.body?.qtd);
        const min = inteiro(req.body?.min);

        if (!nome || nome.length > 100 || !(qtd >= 0)) {
            return res.status(400).json({ erro: 'Informe o nome e a quantidade da peça.' });
        }
        // Mínimo 0 faria a peça nunca gerar alerta de estoque baixo.
        if (!(min >= 1)) {
            return res.status(400).json({ erro: 'O estoque mínimo precisa ser pelo menos 1.' });
        }
        const categoria = normalizarCategoria(req.body?.categoria);
        const unidade = normalizarUnidade(req.body?.unidade);

        try {
            const nova = await prisma.peca.create({ data: { nome, categoria, qtd, min, unidade } });
            res.status(201).json({ id: nova.id, nome, categoria, qtd, min, unidade });
        } catch (err) {
            console.error(' Erro ao cadastrar peça:', err.message);
            res.status(500).json({ erro: 'Erro ao cadastrar peça.' });
        }
    });

    // Atualizar peça (quantidade e/ou estoque mínimo)
    app.put('/atualizar-peca/:id', requireSupervisor, async (req, res) => {
        const { id } = req.params;
        const data = {};
        if (req.body?.qtd !== undefined) {
            const qtd = inteiro(req.body.qtd);
            if (!(qtd >= 0)) return res.status(400).json({ erro: 'qtd inválida.' });
            data.qtd = qtd;
        }
        if (req.body?.min !== undefined) {
            const min = inteiro(req.body.min);
            if (!(min >= 1)) return res.status(400).json({ erro: 'O estoque mínimo precisa ser pelo menos 1.' });
            data.min = min;
        }
        if (!Object.keys(data).length) {
            return res.status(400).json({ erro: 'Nada para atualizar.' });
        }

        try {
            await prisma.peca.update({
                where: { id: Number(id) },
                data
            });
            res.status(200).json({ mensagem: 'Estoque atualizado!' });
        } catch (err) {
            if (err.code === 'P2025') {
                return res.status(404).json({ erro: 'Peça não encontrada.' });
            }
            console.error(' Erro ao atualizar peça:', err.message);
            res.status(500).json({ erro: 'Erro ao atualizar peça.' });
        }
    });

    // Deletar peça
    app.delete('/deletar-peca/:id', requireSupervisor, async (req, res) => {
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

    // Deletar várias peças de uma vez (ex.: esvaziar o estoque)
    app.post('/deletar-pecas', requireSupervisor, async (req, res) => {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : [];
        if (!ids.length || ids.length > 1000 || !ids.every(id => Number.isInteger(id) && id > 0)) {
            return res.status(400).json({ erro: 'Lista de peças inválida.' });
        }
        try {
            const { count } = await prisma.peca.deleteMany({ where: { id: { in: [...new Set(ids)] } } });
            res.status(200).json({ mensagem: 'Peças deletadas!', excluidas: count });
        } catch (err) {
            console.error(' Erro ao deletar peças:', err.message);
            res.status(500).json({ erro: 'Erro ao deletar peças.' });
        }
    });

    // ==========================================
}

module.exports = registerRoutes;
