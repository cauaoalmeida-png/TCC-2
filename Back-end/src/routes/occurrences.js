const { GRUPOS, normalizeRole, requireCoordenacao, requireManutencao } = require('../cargos');

// Ocorrências antigas não têm "fase"; ela é deduzida do status.
function faseDe(o) {
    if (o.status === 'Resolvido') return 'resolvida';
    return ['aberta', 'confirmada', 'em_conserto'].includes(o.fase) ? o.fase : 'aberta';
}

function lerJSON(texto) {
    if (!texto) return null;
    try { return JSON.parse(texto); } catch { return null; }
}

function textoCurto(valor, max) {
    return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

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
        if (ehChecklist && !GRUPOS.gestao.includes(req.user.cargo)) {
            return res.status(403).json({ erro: 'Somente operadores, engenheiros e administradores registram checklists.' });
        }

        const itensString = itensChecklist ? JSON.stringify(itensChecklist) : null;
        const dataOcorrencia = new Date();
        // O operário só abre a ocorrência; quem fecha é a manutenção
        const statusFinal = req.user.cargo !== 'operario' && status === 'Resolvido' ? 'Resolvido' : 'Pendente';

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
                    status: statusFinal,
                    fase: statusFinal === 'Resolvido' ? 'resolvida' : 'aberta',
                    dataResolucao: statusFinal === 'Resolvido' ? dataOcorrencia : null,
                    concluidoPor: statusFinal === 'Resolvido' ? req.user.nome : null,
                    resolucao: req.user.cargo === 'operario' ? '' : (resolucao || ''),
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
                fase: faseDe(o),
                itensChecklist: lerJSON(o.itensChecklist),
                pecasUsadas: lerJSON(o.pecasUsadas) || []
            }));

            res.status(200).json(ocorrencias);
        } catch (err) {
            console.error(' Erro ao buscar ocorrências:', err.message);
            res.status(500).json({ erro: 'Erro ao buscar ocorrências.' });
        }
    });

    // FASE 2: o operador da linha confirma a parada e designa o engenheiro
    app.put('/ocorrencias/:id/confirmar', requireCoordenacao, async (req, res) => {
        const id = Number(req.params.id);
        const orientacao = textoCurto(req.body?.orientacao, 1000);
        const responsavelId = req.body?.responsavelId == null || req.body.responsavelId === '' ? null : Number(req.body.responsavelId);
        if (!Number.isInteger(id) || (responsavelId !== null && !Number.isInteger(responsavelId))) {
            return res.status(400).json({ erro: 'Ocorrência ou engenheiro inválido.' });
        }

        try {
            const ocorrencia = await prisma.ocorrencia.findUnique({ where: { id } });
            if (!ocorrencia) return res.status(404).json({ erro: 'Ocorrência não encontrada.' });
            if (faseDe(ocorrencia) !== 'aberta') {
                return res.status(409).json({ erro: 'Esta ocorrência já foi confirmada.' });
            }

            let responsavelNome = null;
            if (responsavelId !== null) {
                const eng = await prisma.usuario.findUnique({ where: { id: responsavelId } });
                if (!eng || !eng.ativo || !GRUPOS.manutencao.includes(normalizeRole(eng.cargo || eng.tipo))) {
                    return res.status(400).json({ erro: 'Escolha um engenheiro de produção ativo.' });
                }
                responsavelNome = eng.nome || eng.usuario;
            }

            await prisma.ocorrencia.update({
                where: { id },
                data: {
                    fase: 'confirmada',
                    dataConfirmacao: new Date(),
                    confirmadoPor: req.user.nome,
                    orientacao,
                    responsavelId,
                    responsavelNome
                }
            });
            res.json({ mensagem: responsavelNome ? `Parada confirmada e enviada para ${responsavelNome}.` : 'Parada confirmada.' });
        } catch (err) {
            console.error(' Erro ao confirmar ocorrência:', err.message);
            res.status(500).json({ erro: 'Erro ao confirmar ocorrência.' });
        }
    });

    // FASE 3: o engenheiro recebe a ordem e começa o conserto
    app.put('/ocorrencias/:id/iniciar-conserto', requireManutencao, async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ erro: 'Ocorrência inválida.' });

        try {
            const ocorrencia = await prisma.ocorrencia.findUnique({ where: { id } });
            if (!ocorrencia) return res.status(404).json({ erro: 'Ocorrência não encontrada.' });
            const fase = faseDe(ocorrencia);
            if (fase === 'em_conserto') return res.status(409).json({ erro: `O conserto já foi iniciado por ${ocorrencia.responsavelNome || 'outra pessoa'}.` });
            if (fase === 'resolvida') return res.status(409).json({ erro: 'Esta ocorrência já foi resolvida.' });
            if (ocorrencia.responsavelId && ocorrencia.responsavelId !== req.user.id && req.user.cargo !== 'admin') {
                return res.status(403).json({ erro: `Esta ordem foi passada para ${ocorrencia.responsavelNome}.` });
            }

            await prisma.ocorrencia.update({
                where: { id },
                data: {
                    fase: 'em_conserto',
                    dataInicioConserto: new Date(),
                    responsavelId: ocorrencia.responsavelId || req.user.id,
                    responsavelNome: ocorrencia.responsavelNome || req.user.nome
                }
            });
            res.json({ mensagem: 'Conserto iniciado.' });
        } catch (err) {
            console.error(' Erro ao iniciar conserto:', err.message);
            res.status(500).json({ erro: 'Erro ao iniciar o conserto.' });
        }
    });

    // FASE 4: o engenheiro registra o que fez e as peças usadas e fecha.
    // As peças saem do estoque na mesma operação (tudo ou nada).
    app.put('/resolver-ocorrencia/:id', requireManutencao, async (req, res) => {
        const id = Number(req.params.id);
        const resolucao = textoCurto(req.body?.resolucao, 5000);
        const pecasPedido = Array.isArray(req.body?.pecasUsadas) ? req.body.pecasUsadas : [];

        if (!Number.isInteger(id)) return res.status(400).json({ erro: 'Ocorrência inválida.' });
        if (!resolucao) return res.status(400).json({ erro: 'Descreva o que foi feito.' });
        if (pecasPedido.length > 30) return res.status(400).json({ erro: 'Informe no máximo 30 peças.' });

        // Junta a mesma peça repetida numa linha só
        const quantidades = new Map();
        for (const item of pecasPedido) {
            const pecaId = Number(item?.pecaId);
            const quantidade = Number(item?.quantidade);
            if (!Number.isInteger(pecaId) || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 100000) {
                return res.status(400).json({ erro: 'Peça ou quantidade inválida.' });
            }
            quantidades.set(pecaId, (quantidades.get(pecaId) || 0) + quantidade);
        }

        try {
            const ocorrencia = await prisma.ocorrencia.findUnique({ where: { id } });
            if (!ocorrencia) return res.status(404).json({ erro: 'Ocorrência não encontrada.' });
            if (ocorrencia.status === 'Resolvido') return res.status(409).json({ erro: 'Esta ocorrência já foi resolvida.' });
            if (ocorrencia.responsavelId && ocorrencia.responsavelId !== req.user.id && req.user.cargo !== 'admin') {
                return res.status(403).json({ erro: `Esta ordem está com ${ocorrencia.responsavelNome}.` });
            }

            await prisma.$transaction(async (tx) => {
                const usadas = [];
                for (const [pecaId, quantidade] of quantidades) {
                    const peca = await tx.peca.findUnique({ where: { id: pecaId } });
                    if (!peca) throw Object.assign(new Error('Peça não encontrada no estoque.'), { status: 400 });
                    // Só baixa se ainda houver a quantidade (evita estoque negativo)
                    const { count } = await tx.peca.updateMany({
                        where: { id: pecaId, qtd: { gte: quantidade } },
                        data: { qtd: { decrement: quantidade } }
                    });
                    if (!count) {
                        throw Object.assign(new Error(`Só há ${peca.qtd} ${peca.unidade || 'un'} de ${peca.nome} no estoque.`), { status: 409 });
                    }
                    usadas.push({ pecaId, nome: peca.nome, quantidade, unidade: peca.unidade || 'un' });
                }

                const agora = new Date();
                await tx.ocorrencia.update({
                    where: { id },
                    data: {
                        status: 'Resolvido',
                        fase: 'resolvida',
                        resolucao,
                        dataResolucao: agora,
                        concluidoPor: req.user.nome,
                        responsavelId: ocorrencia.responsavelId || req.user.id,
                        responsavelNome: ocorrencia.responsavelNome || req.user.nome,
                        pecasUsadas: usadas.length ? JSON.stringify(usadas) : null
                    }
                });
            });
            res.status(200).json({ mensagem: 'Ocorrência resolvida!' });
        } catch (err) {
            if (err.status) return res.status(err.status).json({ erro: err.message });
            console.error(' Erro ao resolver ocorrência:', err.message);
            res.status(500).json({ erro: 'Erro ao resolver ocorrência.' });
        }
    });

    // Deletar ocorrência
    app.delete('/ocorrencias/:id', requireCoordenacao, async (req, res) => {
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
