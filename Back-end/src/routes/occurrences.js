function registerRoutes(app, { prisma, requireSupervisor }) {
    // ROTAS DE OCORRÊNCIAS
    // ==========================================

    // Cadastrar nova ocorrência
    app.post('/cadastrar-ocorrencia', async (req, res) => {
        const { setor, maquina, tipo, turno, descricao, status, resolucao, itensChecklist } = req.body;

        if (!setor || !maquina || !tipo || !turno) {
            return res.status(400).json({ erro: 'setor, maquina, tipo e turno são obrigatórios.' });
        }
        const tipoNormalizado = String(tipo).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
        const ehChecklist = tipoNormalizado.includes('checklist') || Boolean(itensChecklist);
        if (ehChecklist && !['chefe_geral', 'gerente'].includes(req.user.cargo)) {
            return res.status(403).json({ erro: 'Somente a chefia pode registrar checklists.' });
        }

        const itensString = itensChecklist ? JSON.stringify(itensChecklist) : null;
        const dataOcorrencia = new Date();

        try {
            const nova = await prisma.ocorrencia.create({
                data: {
                    usuarioId: req.user.id,
                    data: dataOcorrencia,
                    setor,
                    maquina,
                    tipo,
                    operador: req.user.nome,
                    turno,
                    descricao: descricao || '',
                    status: req.user.cargo === 'operador' ? 'Pendente' : (status || 'Pendente'),
                    resolucao: req.user.cargo === 'operador' ? '' : (resolucao || ''),
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
            const results = await prisma.ocorrencia.findMany({
                include: { usuario: { select: { usuario: true } } },
                orderBy: { data: 'desc' }
            });

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
    app.put('/resolver-ocorrencia/:id', requireSupervisor, async (req, res) => {
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
    app.delete('/ocorrencias/:id', requireSupervisor, async (req, res) => {
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
}

module.exports = registerRoutes;
