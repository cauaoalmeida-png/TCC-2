function registerRoutes(app, { prisma, requireSupervisor }) {
    // ROTAS DE SETORES
    // ==========================================

    // Cadastrar setor
    app.post('/cadastrar-setor', requireSupervisor, async (req, res) => {
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
    app.delete('/deletar-setor/:id', requireSupervisor, async (req, res) => {
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
}

module.exports = registerRoutes;
