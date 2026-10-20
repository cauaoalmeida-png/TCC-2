function registerRoutes(app, { prisma, requireSupervisor }) {
    // ROTAS DE MÁQUINAS
    // ==========================================

    // Cadastrar máquina
    app.post('/cadastrar-maquina', requireSupervisor, async (req, res) => {
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
    app.delete('/deletar-maquina/:id', requireSupervisor, async (req, res) => {
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
}

module.exports = registerRoutes;
