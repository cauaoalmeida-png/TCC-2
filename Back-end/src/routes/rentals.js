function registerRoutes(app, { prisma, requireSupervisor }) {
    // ROTAS DE GUINDASTES E ALUGUÉIS
    // ==========================================

    app.get('/guindastes', requireSupervisor, async (req, res) => {
        try {
            const results = await prisma.guindaste.findMany({ orderBy: { id: 'asc' } });
            res.json(results);
        } catch (err) {
            console.error('Erro ao buscar guindastes:', err.message);
            res.status(500).json({ erro: 'Erro ao buscar guindastes.' });
        }
    });

    app.post('/cadastrar-guindaste', requireSupervisor, async (req, res) => {
        const { modelo, identificacao } = req.body;
        if (!modelo || typeof modelo !== 'string') {
            return res.status(400).json({ erro: 'O modelo do guindaste é obrigatório.' });
        }

        try {
            const novo = await prisma.guindaste.create({
                data: { modelo: modelo.trim(), identificacao: identificacao ? identificacao.trim() : null }
            });
            res.status(201).json(novo);
        } catch (err) {
            console.error('Erro ao cadastrar guindaste:', err.message);
            res.status(500).json({ erro: 'Erro ao cadastrar guindaste.' });
        }
    });

    app.get('/alugueis', requireSupervisor, async (req, res) => {
        try {
            const results = await prisma.aluguel.findMany({
                include: { guindaste: true },
                orderBy: { id: 'desc' }
            });
            res.json(results);
        } catch (err) {
            console.error('Erro ao buscar aluguéis:', err.message);
            res.status(500).json({ erro: 'Erro ao buscar aluguéis.' });
        }
    });

    app.post('/alugar-guindaste', requireSupervisor, async (req, res) => {
        const { guindasteId, cliente, dataPrevistaDevolucao } = req.body;
        if (!guindasteId || !cliente || !dataPrevistaDevolucao) {
            return res.status(400).json({ erro: 'Guindaste, cliente e data de devolução são obrigatórios.' });
        }

        try {
            const guindaste = await prisma.guindaste.findUnique({ where: { id: Number(guindasteId) } });
            if (!guindaste) return res.status(404).json({ erro: 'Guindaste não encontrado.' });
            if (guindaste.status !== 'Disponível') {
                return res.status(409).json({ erro: 'Este guindaste já está alugado.' });
            }

            const aluguel = await prisma.$transaction(async (tx) => {
                const novoAluguel = await tx.aluguel.create({
                    data: {
                        guindasteId: Number(guindasteId),
                        cliente: cliente.trim(),
                        dataPrevistaDevolucao: new Date(`${dataPrevistaDevolucao}T00:00:00`)
                    }
                });
                await tx.guindaste.update({
                    where: { id: Number(guindasteId) },
                    data: { status: 'Alugado' }
                });
                return novoAluguel;
            });
            res.status(201).json(aluguel);
        } catch (err) {
            console.error('Erro ao registrar aluguel:', err.message);
            res.status(500).json({ erro: 'Erro ao registrar aluguel.' });
        }
    });

    app.put('/devolver-aluguel/:id', requireSupervisor, async (req, res) => {
        try {
            const aluguel = await prisma.aluguel.findUnique({ where: { id: Number(req.params.id) } });
            if (!aluguel) return res.status(404).json({ erro: 'Aluguel não encontrado.' });

            await prisma.$transaction([
                prisma.aluguel.update({
                    where: { id: aluguel.id },
                    data: { status: 'Concluído', dataDevolucaoReal: new Date() }
                }),
                prisma.guindaste.update({
                    where: { id: aluguel.guindasteId },
                    data: { status: 'Disponível' }
                })
            ]);
            res.json({ mensagem: 'Guindaste devolvido com sucesso.' });
        } catch (err) {
            console.error('Erro ao registrar devolução:', err.message);
            res.status(500).json({ erro: 'Erro ao registrar devolução.' });
        }
    });

    app.delete('/deletar-guindaste/:id', requireSupervisor, async (req, res) => {
        try {
            await prisma.guindaste.delete({ where: { id: Number(req.params.id) } });
            res.json({ mensagem: 'Guindaste deletado com sucesso.' });
        } catch (err) {
            if (err.code === 'P2003') {
                return res.status(409).json({ erro: 'Não é possível excluir um guindaste com histórico de aluguel.' });
            }
            console.error('Erro ao deletar guindaste:', err.message);
            res.status(500).json({ erro: 'Erro ao deletar guindaste.' });
        }
    });


    // ==========================================
}

module.exports = registerRoutes;
