const Anthropic = require('@anthropic-ai/sdk').default;

// ROTAS DE IA (relato por IA)
// O operador conta o problema com as próprias palavras (e, se quiser, manda
// uma foto). O Claude devolve os campos da ocorrência já preenchidos e uma
// causa provável. Nada é salvo aqui: o operador confere e registra no
// formulário normal, pela rota /cadastrar-ocorrencia.
// ==========================================

const MODELO = 'claude-opus-5-5';
const TIPOS = ['Parada de máquina', 'Problema de qualidade', 'Falta de material', 'Manutenção preventiva', 'Outro'];
const TURNOS = ['Manhã', 'Tarde', 'Noite'];
const GRAVIDADES = ['Baixa', 'Média', 'Alta', 'Crítica'];
const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_TEXTO = 2000;
const MAX_FOTO_BYTES = 3 * 1024 * 1024;

// Limite simples por usuário, para ninguém gastar a chave da API em massa.
const LIMITE_POR_MINUTO = 10;
const usoPorUsuario = new Map();

function dentroDoLimite(usuarioId) {
    const agora = Date.now();
    const recentes = (usoPorUsuario.get(usuarioId) || []).filter(t => agora - t < 60_000);
    if (recentes.length >= LIMITE_POR_MINUTO) {
        usoPorUsuario.set(usuarioId, recentes);
        return false;
    }
    recentes.push(agora);
    usoPorUsuario.set(usuarioId, recentes);
    return true;
}

// Turno pelo horário da Bahia, usado quando o operador não diz o turno.
function turnoAtual() {
    const hora = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Bahia' }).format(new Date()));
    if (hora >= 6 && hora < 14) return 'Manhã';
    if (hora >= 14 && hora < 22) return 'Tarde';
    return 'Noite';
}

function validarFoto(foto) {
    if (!foto) return null;
    if (typeof foto !== 'object' || !TIPOS_IMAGEM.includes(foto.mediaType) || typeof foto.data !== 'string') {
        return { erro: 'Foto inválida. Envie JPG, PNG ou WEBP.' };
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(foto.data)) {
        return { erro: 'Foto inválida.' };
    }
    if (Buffer.byteLength(foto.data, 'base64') > MAX_FOTO_BYTES) {
        return { erro: 'Foto muito grande. Envie uma imagem de até 3 MB.' };
    }
    return { foto };
}

function montarSchema(setores, maquinas) {
    return {
        type: 'object',
        additionalProperties: false,
        required: ['setor', 'maquina', 'tipo', 'turno', 'descricao', 'causaProvavel', 'acaoSugerida', 'gravidade'],
        properties: {
            setor: { type: 'string', enum: [...setores, ''] },
            maquina: { type: 'string', enum: [...maquinas, ''] },
            tipo: { type: 'string', enum: TIPOS },
            turno: { type: 'string', enum: TURNOS },
            descricao: { type: 'string' },
            causaProvavel: { type: 'string' },
            acaoSugerida: { type: 'string' },
            gravidade: { type: 'string', enum: GRAVIDADES }
        }
    };
}

function montarInstrucoes(setores, maquinasPorSetor, turno) {
    const listaMaquinas = setores
        .map(s => `- ${s}: ${(maquinasPorSetor.get(s) || []).join(', ') || '(sem máquinas cadastradas)'}`)
        .join('\n');
    return `Você ajuda operadores de uma fábrica a registrar ocorrências no FactoryTrack.
O operador descreve o problema com as próprias palavras, às vezes com erros de digitação ou ditado por voz, e pode mandar uma foto.
Preencha os campos da ocorrência:
- setor e maquina: escolha só entre os cadastrados abaixo. A máquina precisa pertencer ao setor escolhido. Se o relato não deixar claro, use "".
- tipo: o tipo de ocorrência que melhor se encaixa.
- turno: use "${turno}" (turno atual), a não ser que o operador diga outro.
- descricao: reescreva o relato em português claro e objetivo, em até 4 frases, sem inventar fatos que o operador não disse. Se houver foto, inclua o que ela mostra de relevante.
- causaProvavel: a causa mais provável em 1 ou 2 frases, deixando claro que é uma hipótese a ser confirmada pela manutenção.
- acaoSugerida: o primeiro passo seguro que a equipe deve tomar, em 1 ou 2 frases. Se houver risco a pessoas, comece por isolar a área ou desligar o equipamento.
- gravidade: Crítica se há risco a pessoas ou a linha inteira parou; Alta se uma máquina parou; Média se a produção continua com perda; Baixa nos demais casos.

Setores e máquinas cadastrados:
${listaMaquinas || '(nenhum setor cadastrado)'}`;
}

function registerRoutes(app, { prisma }) {
    const cliente = process.env.ANTHROPIC_API_KEY
        ? new Anthropic({ timeout: 45_000, maxRetries: 1 })
        : null;

    // Diz para a tela se o recurso de IA está ligado (chave configurada).
    app.get('/ia/status', (req, res) => {
        res.json({ ativa: Boolean(cliente) });
    });

    // Recebe o relato livre e devolve a ocorrência preenchida.
    app.post('/ia/relato', async (req, res) => {
        if (!cliente) {
            return res.status(503).json({ erro: 'A IA não está configurada neste servidor.' });
        }

        const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim() : '';
        if (texto.length < 5 || texto.length > MAX_TEXTO) {
            return res.status(400).json({ erro: `Descreva o problema em 5 a ${MAX_TEXTO} caracteres.` });
        }
        const checagemFoto = validarFoto(req.body?.foto);
        if (checagemFoto?.erro) {
            return res.status(400).json({ erro: checagemFoto.erro });
        }
        if (!dentroDoLimite(req.user.id)) {
            return res.status(429).json({ erro: 'Muitos pedidos seguidos. Aguarde um minuto e tente de novo.' });
        }

        try {
            const [setoresBanco, maquinasBanco] = await Promise.all([
                prisma.setor.findMany({ select: { nomeSetor: true }, orderBy: { nomeSetor: 'asc' } }),
                prisma.maquina.findMany({ select: { nomeMaquina: true, setorAssociado: true }, orderBy: { nomeMaquina: 'asc' } })
            ]);
            const setores = [...new Set(setoresBanco.map(s => s.nomeSetor))];
            const maquinasPorSetor = new Map();
            for (const m of maquinasBanco) {
                if (!maquinasPorSetor.has(m.setorAssociado)) maquinasPorSetor.set(m.setorAssociado, []);
                maquinasPorSetor.get(m.setorAssociado).push(m.nomeMaquina);
            }
            const maquinas = [...new Set(maquinasBanco.map(m => m.nomeMaquina))];

            const conteudo = [];
            if (checagemFoto?.foto) {
                conteudo.push({
                    type: 'image',
                    source: { type: 'base64', media_type: checagemFoto.foto.mediaType, data: checagemFoto.foto.data }
                });
            }
            conteudo.push({ type: 'text', text: `Relato do operador:\n<relato>\n${texto}\n</relato>` });

            const resposta = await cliente.beta.messages.create({
                model: MODELO,
                max_tokens: 16000,
                betas: ['server-side-fallback-2026-07-01'],
                fallbacks: 'default',
                output_config: {
                    effort: 'low',
                    format: { type: 'json_schema', schema: montarSchema(setores, maquinas) }
                },
                system: montarInstrucoes(setores, maquinasPorSetor, turnoAtual()),
                messages: [{ role: 'user', content: conteudo }]
            });

            if (resposta.stop_reason === 'refusal') {
                return res.status(422).json({ erro: 'A IA não conseguiu analisar este relato. Preencha o formulário manualmente.' });
            }
            const blocoTexto = resposta.content.find(b => b.type === 'text');
            if (!blocoTexto) {
                return res.status(502).json({ erro: 'A IA não devolveu uma resposta. Tente de novo.' });
            }

            const sugestao = JSON.parse(blocoTexto.text);
            // Garante que a máquina sugerida pertence ao setor sugerido.
            if (sugestao.maquina && !(maquinasPorSetor.get(sugestao.setor) || []).includes(sugestao.maquina)) {
                sugestao.maquina = '';
            }
            res.status(200).json(sugestao);
        } catch (err) {
            if (err instanceof Anthropic.AuthenticationError) {
                console.error(' Chave da IA inválida:', err.message);
                return res.status(503).json({ erro: 'A chave da IA está inválida. Avise o administrador.' });
            }
            if (err instanceof Anthropic.RateLimitError) {
                return res.status(429).json({ erro: 'A IA está ocupada agora. Tente de novo em instantes.' });
            }
            if (err instanceof Anthropic.APIError) {
                console.error(' Erro da API de IA:', err.status, err.message);
                return res.status(502).json({ erro: 'A IA está indisponível agora. Preencha o formulário manualmente.' });
            }
            console.error(' Erro no relato por IA:', err.message);
            res.status(500).json({ erro: 'Erro ao analisar o relato.' });
        }
    });

    // ==========================================
}

module.exports = registerRoutes;
