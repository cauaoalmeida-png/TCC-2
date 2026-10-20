function registerRoutes(app, { prisma, requireSupervisor }) {
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
    app.post('/cadastrar-peca', requireSupervisor, async (req, res) => {
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
    app.put('/atualizar-peca/:id', requireSupervisor, async (req, res) => {
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

    // ==========================================
}

module.exports = registerRoutes;
