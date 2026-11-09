// ROTAS DE IA
// Todas as rotas só sugerem: nada é gravado no banco por aqui. Quem confere
// e salva é sempre a pessoa, pelas rotas normais do sistema.
//   POST /ia/relato          operador conta o problema, IA preenche a ocorrência
//   POST /ia/pergunta        chefia pergunta sobre os dados da fábrica
//   POST /ia/resumo          chefia pede o resumo da semana
//   POST /ia/solucao         chefia pede sugestão de solução e peças ao resolver
//   POST /ia/nota-fiscal     chefia manda a nota fiscal, IA lista as peças
//   POST /ia/checklist-foto  chefia manda a foto da máquina, IA aponta itens
// ==========================================

// Gemini (Google AI Studio), que tem uso gratuito. Se o modelo principal
// estiver sem cota ou fora do ar, tenta o reserva (mais leve).
const MODELO = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const MODELO_RESERVA = process.env.GEMINI_MODEL_RESERVA || 'gemini-3.5-flash-lite';
const URL_GEMINI = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
const TIPOS = ['Parada de máquina', 'Problema de qualidade', 'Falta de material', 'Manutenção preventiva', 'Outro'];
const TURNOS = ['Manhã', 'Tarde', 'Noite'];
const GRAVIDADES = ['Baixa', 'Média', 'Alta', 'Crítica'];
const CATEGORIAS_PECA = ['Fixação', 'Elétrico', 'Mecânico', 'Hidráulico', 'Outro'];
const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_TEXTO = 2000;
const MAX_ARQUIVO_BYTES = 3 * 1024 * 1024;
const MAX_XML = 200_000;

// Rotas que recebem foto ou arquivo e por isso aceitam corpo maior (ver server.js).
const ROTAS_COM_ARQUIVO = ['/ia/relato', '/ia/nota-fiscal', '/ia/checklist-foto'];

// Limite simples por usuário, para ninguém gastar a chave da API em massa.
const LIMITE_POR_MINUTO = 20;
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

// Hora da Bahia, usada para o turno e para a data de "hoje".
function agoraNaBahia() {
    const partes = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Bahia'
    }).formatToParts(new Date()).map(p => [p.type, p.value]));
    return { data: `${partes.day}/${partes.month}/${partes.year}`, hora: Number(partes.hour) };
}

function turnoAtual() {
    const { hora } = agoraNaBahia();
    if (hora >= 6 && hora < 14) return 'Manhã';
    if (hora >= 14 && hora < 22) return 'Tarde';
    return 'Noite';
}

function textoValido(valor, minimo = 5, maximo = MAX_TEXTO) {
    const texto = typeof valor === 'string' ? valor.trim() : '';
    return texto.length >= minimo && texto.length <= maximo ? texto : null;
}

// Confere um arquivo em base64 vindo do navegador.
function validarArquivo(arquivo, tiposAceitos) {
    if (!arquivo) return null;
    if (typeof arquivo !== 'object' || !tiposAceitos.includes(arquivo.mediaType) || typeof arquivo.data !== 'string') {
        return { erro: 'Arquivo inválido.' };
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(arquivo.data)) {
        return { erro: 'Arquivo inválido.' };
    }
    if (Buffer.byteLength(arquivo.data, 'base64') > MAX_ARQUIVO_BYTES) {
        return { erro: 'Arquivo muito grande. Envie até 3 MB.' };
    }
    return { arquivo };
}

function blocoArquivo(arquivo) {
    return { inlineData: { mimeType: arquivo.mediaType, data: arquivo.data } };
}

function corta(texto, tamanho) {
    const t = String(texto || '');
    return t.length > tamanho ? t.slice(0, tamanho) + '…' : t;
}

function dataCurta(data) {
    return data ? new Date(data).toISOString().slice(0, 10) : null;
}

// Erro que já vem com a mensagem certa para a tela.
class ErroIA extends Error {
    constructor(status, mensagem) {
        super(mensagem);
        this.status = status;
    }
}

// Erro devolvido pela API do Gemini.
class ErroAPI extends Error {
    constructor(status, mensagem) {
        super(mensagem);
        this.status = status;
    }
}

function responderErro(res, err, contexto) {
    if (err instanceof ErroIA) {
        return res.status(err.status).json({ erro: err.message });
    }
    if (err instanceof ErroAPI) {
        if ((err.status === 400 && /API key/i.test(err.message)) || err.status === 401 || err.status === 403) {
            console.error(' Chave da IA inválida:', err.message);
            return res.status(503).json({ erro: 'A chave da IA está inválida. Avise o administrador.' });
        }
        if (err.status === 429) {
            return res.status(429).json({ erro: 'A cota gratuita da IA acabou por agora. Tente de novo mais tarde.' });
        }
        console.error(` Erro da API de IA (${contexto}):`, err.status, err.message);
        return res.status(502).json({ erro: 'A IA está indisponível agora. Tente de novo mais tarde.' });
    }
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        return res.status(504).json({ erro: 'A IA demorou demais para responder. Tente de novo.' });
    }
    console.error(` Erro na IA (${contexto}):`, err.message);
    return res.status(500).json({ erro: 'Erro ao falar com a IA.' });
}

function registerRoutes(app, { prisma, requireSupervisor }) {
    const chave = process.env.GEMINI_API_KEY || '';
    const ativa = Boolean(chave);

    // Uma chamada ao Gemini pedindo JSON no formato do schema.
    async function chamarGemini(modelo, corpo, tempoMs) {
        const resposta = await fetch(`${URL_GEMINI}/${encodeURIComponent(modelo)}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
            body: JSON.stringify(corpo),
            signal: AbortSignal.timeout(tempoMs)
        });
        const dados = await resposta.json().catch(() => ({}));
        if (!resposta.ok) {
            throw new ErroAPI(resposta.status, dados.error?.message || `HTTP ${resposta.status}`);
        }
        return dados;
    }

    // Faz o pedido à IA e devolve o JSON já no formato do schema.
    // `conteudo` é uma lista de { type: 'text', text } ou blocos de arquivo.
    async function pedirJSON({ system, conteudo, schema }) {
        const corpo = {
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: conteudo.map(b => (b.type === 'text' ? { text: b.text } : b)) }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseJsonSchema: schema,
                maxOutputTokens: 8192
            }
        };
        let dados;
        try {
            dados = await chamarGemini(MODELO, corpo, 30_000);
        } catch (err) {
            const tentarReserva = MODELO_RESERVA && MODELO_RESERVA !== MODELO &&
                (err.name === 'TimeoutError' || (err instanceof ErroAPI && [404, 429, 500, 503].includes(err.status)));
            if (!tentarReserva) throw err;
            console.warn(` IA: ${MODELO} falhou (${err.status || err.name}), tentando ${MODELO_RESERVA}`);
            dados = await chamarGemini(MODELO_RESERVA, corpo, 25_000);
        }
        if (dados.promptFeedback?.blockReason) {
            throw new ErroIA(422, 'A IA não conseguiu analisar este pedido.');
        }
        const candidato = dados.candidates?.[0];
        if (candidato?.finishReason === 'MAX_TOKENS') {
            throw new ErroIA(502, 'A resposta da IA ficou grande demais. Tente um pedido menor.');
        }
        if (candidato && !['STOP', undefined].includes(candidato.finishReason)) {
            throw new ErroIA(422, 'A IA não conseguiu analisar este pedido.');
        }
        const texto = (candidato?.content?.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join('');
        if (!texto) throw new ErroIA(502, 'A IA não devolveu uma resposta. Tente de novo.');
        try {
            return JSON.parse(texto);
        } catch {
            throw new ErroIA(502, 'A IA devolveu uma resposta inválida. Tente de novo.');
        }
    }

    // Checagens comuns a todas as rotas que chamam a IA.
    function prepararPedido(req, res, next) {
        if (!ativa) {
            return res.status(503).json({ erro: 'A IA não está configurada neste servidor.' });
        }
        if (!dentroDoLimite(req.user.id)) {
            return res.status(429).json({ erro: 'Muitos pedidos seguidos. Aguarde um minuto e tente de novo.' });
        }
        next();
    }

    async function carregarSetoresEMaquinas() {
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
        return { setores, maquinasPorSetor, maquinas: [...new Set(maquinasBanco.map(m => m.nomeMaquina))] };
    }

    // Retrato compacto da fábrica para as perguntas e o resumo da chefia.
    async function retratoDaFabrica() {
        const [ocorrencias, pecas, maquinas, guindastes, alugueis] = await Promise.all([
            prisma.ocorrencia.findMany({ orderBy: { data: 'desc' }, take: 300 }),
            prisma.peca.findMany({ orderBy: { nome: 'asc' } }),
            prisma.maquina.findMany({ orderBy: { nomeMaquina: 'asc' } }),
            prisma.guindaste.findMany({ orderBy: { id: 'asc' } }),
            prisma.aluguel.findMany({ where: { status: 'Ativo' }, include: { guindaste: { select: { modelo: true } } } })
        ]);
        return {
            hoje: agoraNaBahia().data,
            maquinas: maquinas.map(m => ({ nome: m.nomeMaquina, setor: m.setorAssociado })),
            ocorrencias: ocorrencias.map(o => ({
                data: dataCurta(o.data),
                setor: o.setor,
                maquina: o.maquina,
                tipo: o.tipo,
                turno: o.turno,
                status: o.status,
                descricao: corta(o.descricao, 300),
                resolucao: corta(o.resolucao, 200) || undefined,
                resolvidaEm: dataCurta(o.dataResolucao) || undefined
            })),
            estoque: pecas.map(p => ({ peca: p.nome, categoria: p.categoria, quantidade: p.qtd, minimo: p.min, unidade: p.unidade })),
            guindastes: guindastes.map(g => ({ modelo: g.modelo, identificacao: g.identificacao, status: g.status })),
            alugueisAtivos: alugueis.map(a => ({
                guindaste: a.guindaste?.modelo,
                cliente: a.cliente,
                devolucaoPrevista: dataCurta(a.dataPrevistaDevolucao)
            }))
        };
    }

    // Mesma máquina com o mesmo tipo de problema 2 ou mais vezes em 30 dias.
    async function falhasRepetidas() {
        const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentes = await prisma.ocorrencia.findMany({ where: { data: { gte: desde } }, select: { maquina: true, tipo: true } });
        const contagem = new Map();
        for (const o of recentes) {
            if (/checklist/i.test(o.tipo)) continue;
            const chave = `${o.maquina}|${o.tipo}`;
            contagem.set(chave, (contagem.get(chave) || 0) + 1);
        }
        return [...contagem.entries()]
            .filter(([, vezes]) => vezes >= 2)
            .map(([chave, vezes]) => {
                const [maquina, tipo] = chave.split('|');
                return { maquina, tipo, vezes };
            })
            .sort((a, b) => b.vezes - a.vezes);
    }

    // Diz para as telas se o recurso de IA está ligado (chave configurada).
    app.get('/ia/status', (req, res) => {
        res.json({ ativa });
    });

    // ==========================================
    // RELATO POR IA (tela de Ocorrência)
    // ==========================================
    app.post('/ia/relato', prepararPedido, async (req, res) => {
        const texto = textoValido(req.body?.texto);
        if (!texto) {
            return res.status(400).json({ erro: `Descreva o problema em 5 a ${MAX_TEXTO} caracteres.` });
        }
        const checagemFoto = validarArquivo(req.body?.foto, TIPOS_IMAGEM);
        if (checagemFoto?.erro) {
            return res.status(400).json({ erro: checagemFoto.erro });
        }

        try {
            const { setores, maquinasPorSetor, maquinas } = await carregarSetoresEMaquinas();
            const listaMaquinas = setores
                .map(s => `- ${s}: ${(maquinasPorSetor.get(s) || []).join(', ') || '(sem máquinas cadastradas)'}`)
                .join('\n');

            const conteudo = [];
            if (checagemFoto?.arquivo) conteudo.push(blocoArquivo(checagemFoto.arquivo));
            conteudo.push({ type: 'text', text: `Relato do operador:\n<relato>\n${texto}\n</relato>` });

            const sugestao = await pedirJSON({
                conteudo,
                schema: {
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
                },
                system: `Você ajuda operadores de uma fábrica a registrar ocorrências no FactoryTrack.
O operador descreve o problema com as próprias palavras, às vezes com erros de digitação ou ditado por voz, e pode mandar uma foto.
Preencha os campos da ocorrência:
- setor e maquina: escolha só entre os cadastrados abaixo. A máquina precisa pertencer ao setor escolhido. Se o relato não deixar claro, use "".
- tipo: o tipo de ocorrência que melhor se encaixa.
- turno: use "${turnoAtual()}" (turno atual), a não ser que o operador diga outro.
- descricao: reescreva o relato em português claro e objetivo, em até 4 frases, sem inventar fatos que o operador não disse. Se houver foto, inclua o que ela mostra de relevante.
- causaProvavel: a causa mais provável em 1 ou 2 frases, deixando claro que é uma hipótese a ser confirmada pela manutenção.
- acaoSugerida: o primeiro passo seguro que a equipe deve tomar, em 1 ou 2 frases. Se houver risco a pessoas, comece por isolar a área ou desligar o equipamento.
- gravidade: Crítica se há risco a pessoas ou a linha inteira parou; Alta se uma máquina parou; Média se a produção continua com perda; Baixa nos demais casos.

Setores e máquinas cadastrados:
${listaMaquinas || '(nenhum setor cadastrado)'}`
            });

            // Garante que a máquina sugerida pertence ao setor sugerido.
            if (sugestao.maquina && !(maquinasPorSetor.get(sugestao.setor) || []).includes(sugestao.maquina)) {
                sugestao.maquina = '';
            }
            res.status(200).json(sugestao);
        } catch (err) {
            responderErro(res, err, 'relato');
        }
    });

    // ==========================================
    // PERGUNTAS DA CHEFIA (tela Painel)
    // ==========================================
    app.post('/ia/pergunta', requireSupervisor, prepararPedido, async (req, res) => {
        const pergunta = textoValido(req.body?.pergunta, 3, 500);
        if (!pergunta) {
            return res.status(400).json({ erro: 'Escreva uma pergunta de 3 a 500 caracteres.' });
        }

        try {
            const dados = await retratoDaFabrica();
            const resultado = await pedirJSON({
                conteudo: [{ type: 'text', text: `Dados atuais da fábrica (JSON):\n${JSON.stringify(dados)}\n\nPergunta do gestor:\n<pergunta>\n${pergunta}\n</pergunta>` }],
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['resposta'],
                    properties: { resposta: { type: 'string' } }
                },
                system: `Você é o assistente de gestão do FactoryTrack, um sistema de manutenção industrial.
Responda à pergunta do gestor usando só os dados fornecidos (últimas 300 ocorrências, estoque, máquinas e guindastes).
Responda em português, de forma direta, em até 6 frases curtas ou uma lista curta com "- " no começo de cada linha.
Traga números quando ajudarem. Se os dados não forem suficientes para responder, diga isso e o que falta.
Não use markdown além das listas com "- ".`
            });
            res.status(200).json(resultado);
        } catch (err) {
            responderErro(res, err, 'pergunta');
        }
    });

    // ==========================================
    // RESUMO DA SEMANA (tela Painel)
    // ==========================================
    app.post('/ia/resumo', requireSupervisor, prepararPedido, async (req, res) => {
        try {
            const [dados, repetidas] = await Promise.all([retratoDaFabrica(), falhasRepetidas()]);
            const resumo = await pedirJSON({
                conteudo: [{ type: 'text', text: `Dados atuais da fábrica (JSON):\n${JSON.stringify(dados)}\n\nFalhas repetidas nos últimos 30 dias (calculadas pelo sistema):\n${JSON.stringify(repetidas)}` }],
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['visaoGeral', 'destaques', 'falhasRepetidas', 'estoque', 'recomendacoes'],
                    properties: {
                        visaoGeral: { type: 'string' },
                        destaques: { type: 'array', items: { type: 'string' } },
                        falhasRepetidas: {
                            type: 'array',
                            items: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['maquina', 'problema', 'vezes', 'recomendacao'],
                                properties: {
                                    maquina: { type: 'string' },
                                    problema: { type: 'string' },
                                    vezes: { type: 'integer' },
                                    recomendacao: { type: 'string' }
                                }
                            }
                        },
                        estoque: { type: 'array', items: { type: 'string' } },
                        recomendacoes: { type: 'array', items: { type: 'string' } }
                    }
                },
                system: `Você escreve o resumo semanal de manutenção do FactoryTrack para a chefia da fábrica.
Use só os dados fornecidos. "Semana" são os últimos 7 dias até hoje.
- visaoGeral: 2 ou 3 frases com o quadro da semana (quantas ocorrências, quantas paradas, quantas resolvidas e pendentes).
- destaques: até 5 fatos importantes da semana, um por item.
- falhasRepetidas: use a lista calculada pelo sistema (não invente outras); para cada uma, descreva o problema em poucas palavras e recomende uma ação, como manutenção preventiva ou troca de peça. Lista vazia se não houver.
- estoque: peças abaixo do mínimo ou perto dele, uma por item. Lista vazia se estiver tudo bem.
- recomendacoes: até 4 ações práticas para a próxima semana, em ordem de prioridade.
Escreva em português, em frases curtas, sem markdown.`
            });
            res.status(200).json(resumo);
        } catch (err) {
            responderErro(res, err, 'resumo');
        }
    });

    // ==========================================
    // SUGESTÃO DE SOLUÇÃO E PEÇAS (tela Histórico, ao resolver)
    // ==========================================
    app.post('/ia/solucao', requireSupervisor, prepararPedido, async (req, res) => {
        const id = Number(req.body?.ocorrenciaId);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ erro: 'Ocorrência inválida.' });
        }

        try {
            const ocorrencia = await prisma.ocorrencia.findUnique({ where: { id } });
            if (!ocorrencia) return res.status(404).json({ erro: 'Ocorrência não encontrada.' });

            const [parecidas, pecas] = await Promise.all([
                prisma.ocorrencia.findMany({
                    where: { id: { not: id }, status: 'Resolvido', OR: [{ maquina: ocorrencia.maquina }, { tipo: ocorrencia.tipo }] },
                    orderBy: { data: 'desc' },
                    take: 25
                }),
                prisma.peca.findMany({ orderBy: { nome: 'asc' } })
            ]);
            const idsPecas = pecas.map(p => p.id);

            const sugestao = await pedirJSON({
                conteudo: [{
                    type: 'text',
                    text: `Ocorrência a resolver:\n${JSON.stringify({
                        data: dataCurta(ocorrencia.data), setor: ocorrencia.setor, maquina: ocorrencia.maquina,
                        tipo: ocorrencia.tipo, descricao: corta(ocorrencia.descricao, 1500)
                    })}\n\nOcorrências já resolvidas da mesma máquina ou do mesmo tipo:\n${JSON.stringify(parecidas.map(o => ({
                        data: dataCurta(o.data), maquina: o.maquina, tipo: o.tipo,
                        descricao: corta(o.descricao, 300), resolucao: corta(o.resolucao, 300)
                    })))}\n\nPeças em estoque:\n${JSON.stringify(pecas.map(p => ({ pecaId: p.id, nome: p.nome, categoria: p.categoria, quantidade: p.qtd, unidade: p.unidade })))}`
                }],
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['solucao', 'baseadoEm', 'pecas'],
                    properties: {
                        solucao: { type: 'string' },
                        baseadoEm: { type: 'string' },
                        pecas: {
                            type: 'array',
                            items: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['pecaId', 'quantidade'],
                                properties: {
                                    pecaId: { type: 'integer', enum: idsPecas.length ? idsPecas : [0] },
                                    quantidade: { type: 'integer' }
                                }
                            }
                        }
                    }
                },
                system: `Você ajuda a chefia de manutenção do FactoryTrack a registrar como uma ocorrência foi resolvida.
- solucao: um texto curto (até 3 frases) no formato de registro de resolução, descrevendo o que provavelmente foi feito, com base nos casos parecidos já resolvidos. O gestor vai conferir e editar antes de salvar.
- baseadoEm: 1 frase dizendo em que se baseou, por exemplo "2 paradas parecidas na mesma máquina foram resolvidas trocando a correia". Se não houver casos parecidos, diga que a sugestão é genérica.
- pecas: as peças do estoque que provavelmente foram usadas, com a quantidade. Use só pecaId da lista. Lista vazia se nenhuma peça fizer sentido.
Escreva em português.`
            });

            // Só devolve peças que existem, com quantidade entre 1 e o disponível.
            const porId = new Map(pecas.map(p => [p.id, p]));
            sugestao.pecas = (sugestao.pecas || [])
                .filter(p => porId.has(p.pecaId) && p.quantidade > 0)
                .map(p => {
                    const peca = porId.get(p.pecaId);
                    return { pecaId: peca.id, nome: peca.nome, unidade: peca.unidade, disponivel: peca.qtd, quantidade: Math.min(p.quantidade, peca.qtd) };
                })
                .filter(p => p.quantidade > 0);
            res.status(200).json(sugestao);
        } catch (err) {
            responderErro(res, err, 'solução');
        }
    });

    // ==========================================
    // ENTRADA DE PEÇAS PELA NOTA FISCAL (tela Estoque)
    // ==========================================
    app.post('/ia/nota-fiscal', requireSupervisor, prepararPedido, async (req, res) => {
        const xml = typeof req.body?.xml === 'string' ? req.body.xml.trim() : '';
        const checagem = validarArquivo(req.body?.arquivo, [...TIPOS_IMAGEM, 'application/pdf']);
        if (checagem?.erro) return res.status(400).json({ erro: checagem.erro });
        if (!checagem?.arquivo && !xml) {
            return res.status(400).json({ erro: 'Envie a foto, o PDF ou o XML da nota fiscal.' });
        }
        if (xml.length > MAX_XML) {
            return res.status(400).json({ erro: 'XML muito grande.' });
        }

        try {
            const pecas = await prisma.peca.findMany({ orderBy: { nome: 'asc' } });
            const idsPecas = pecas.map(p => p.id);

            const conteudo = [];
            if (checagem?.arquivo) conteudo.push(blocoArquivo(checagem.arquivo));
            if (xml) conteudo.push({ type: 'text', text: `XML da nota fiscal:\n<xml>\n${xml}\n</xml>` });
            conteudo.push({ type: 'text', text: `Peças já cadastradas no estoque:\n${JSON.stringify(pecas.map(p => ({ pecaId: p.id, nome: p.nome, categoria: p.categoria, unidade: p.unidade })))}` });

            const nota = await pedirJSON({
                conteudo,
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['fornecedor', 'numero', 'itens'],
                    properties: {
                        fornecedor: { type: 'string' },
                        numero: { type: 'string' },
                        itens: {
                            type: 'array',
                            items: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['descricao', 'quantidade', 'unidade', 'pecaId', 'nomeSugerido', 'categoria'],
                                properties: {
                                    descricao: { type: 'string' },
                                    quantidade: { type: 'integer' },
                                    unidade: { type: 'string', enum: ['un', 'kg', 'm', 'L', 'cx'] },
                                    pecaId: { type: 'integer', enum: [...idsPecas, 0] },
                                    nomeSugerido: { type: 'string' },
                                    categoria: { type: 'string', enum: CATEGORIAS_PECA }
                                }
                            }
                        }
                    }
                },
                system: `Você lê notas fiscais de compra (foto, PDF ou XML da NF-e) para dar entrada de peças no estoque do FactoryTrack.
Para cada produto da nota:
- descricao: a descrição como está na nota.
- quantidade: a quantidade comprada, em número inteiro (arredonde se precisar).
- unidade: a unidade mais próxima entre un, kg, m, L e cx.
- pecaId: o id da peça já cadastrada que é o mesmo produto, ou 0 se for um produto novo. Só associe quando tiver certeza.
- nomeSugerido: um nome curto e claro para cadastrar a peça (use o nome da peça cadastrada quando houver associação).
- categoria: a categoria que melhor se encaixa.
fornecedor e numero: o nome do emitente e o número da nota, ou "" se não estiver legível.
Ignore fretes, impostos e serviços. Não invente itens que não estão na nota.`
            });

            const porId = new Map(pecas.map(p => [p.id, p]));
            nota.itens = (nota.itens || [])
                .filter(i => i.quantidade > 0)
                .map(i => {
                    const peca = porId.get(i.pecaId);
                    return { ...i, pecaId: peca ? peca.id : 0, nomeAtual: peca ? peca.nome : null, quantidadeAtual: peca ? peca.qtd : null };
                });
            res.status(200).json(nota);
        } catch (err) {
            responderErro(res, err, 'nota fiscal');
        }
    });

    // ==========================================
    // CHECKLIST POR FOTO (tela Checklist)
    // ==========================================
    app.post('/ia/checklist-foto', requireSupervisor, prepararPedido, async (req, res) => {
        const checagem = validarArquivo(req.body?.foto, TIPOS_IMAGEM);
        if (!checagem?.arquivo) {
            return res.status(400).json({ erro: checagem?.erro || 'Envie uma foto do equipamento.' });
        }
        const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
        const itensValidos = itens.filter(i => i && /^[a-z0-9_-]{1,20}$/i.test(i.id) && typeof i.label === 'string' && i.label.length <= 150);
        if (!itensValidos.length || itensValidos.length > 80 || itensValidos.length !== itens.length) {
            return res.status(400).json({ erro: 'Lista de itens do checklist inválida.' });
        }
        const maquina = typeof req.body?.maquina === 'string' ? corta(req.body.maquina, 100) : '';

        try {
            const ids = itensValidos.map(i => i.id);
            const analise = await pedirJSON({
                conteudo: [
                    blocoArquivo(checagem.arquivo),
                    { type: 'text', text: `${maquina ? `Equipamento: ${maquina}\n` : ''}Itens do checklist:\n${itensValidos.map(i => `${i.id}: ${i.label}`).join('\n')}` }
                ],
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['itens', 'observacaoGeral'],
                    properties: {
                        itens: {
                            type: 'array',
                            items: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['id', 'motivo'],
                                properties: {
                                    id: { type: 'string', enum: ids },
                                    motivo: { type: 'string' }
                                }
                            }
                        },
                        observacaoGeral: { type: 'string' }
                    }
                },
                system: `Você ajuda inspetores de manutenção do FactoryTrack a fazer o checklist de uma máquina a partir de uma foto.
- itens: só os itens do checklist que aparecem com problema na foto. Para cada um, o motivo em 1 frase curta dizendo o que se vê na imagem. Não marque o que não dá para ver na foto (ruído, cheiro, funcionamento de botões).
- observacaoGeral: 1 ou 2 frases sobre o estado geral visível e o que o inspetor deve conferir pessoalmente.
O inspetor vai confirmar cada item. Escreva em português.`
            });
            const vistos = new Set();
            analise.itens = (analise.itens || []).filter(i => ids.includes(i.id) && !vistos.has(i.id) && vistos.add(i.id));
            res.status(200).json(analise);
        } catch (err) {
            responderErro(res, err, 'checklist');
        }
    });

    // ==========================================
}

registerRoutes.ROTAS_COM_ARQUIVO = ROTAS_COM_ARQUIVO;
module.exports = registerRoutes;
