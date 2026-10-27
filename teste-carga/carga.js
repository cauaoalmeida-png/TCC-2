// Teste de carga do FactoryTrack
// Simula N pessoas usando o sistema ao mesmo tempo (abrindo o painel,
// o histórico, o estoque e registrando ocorrências) e mede o tempo de
// resposta e os erros. Não precisa instalar nada: só Node 18 ou mais novo.
//
// Uso (com o sistema rodando no PC, `npm start` em Back-end/):
//   node teste-carga/carga.js --usuarios 30 --duracao 60
//   node teste-carga/carga.js --usuarios 80 --duracao 120
//   node teste-carga/carga.js --usuarios 80 --estresse      (sem pausas: pior caso)
//   node teste-carga/carga.js --limpar                      (apaga as ocorrências de teste)
//
// Contas usadas (crie antes em Cadastros, ou passe outras pelos parâmetros):
//   --chefe-email / --chefe-senha        conta de Chefe Geral ou Gerente
//   --operador-email / --operador-senha  conta de Operador
//
// Segurança: por padrão só aceita localhost. Para mirar outro endereço é
// preciso passar --permitir-remoto (NÃO use contra a Vercel/TiDB gratuitos).

const fs = require('node:fs');
const path = require('node:path');

const MARCADOR = '[TESTE DE CARGA]';

function lerArgs() {
    const padrao = {
        url: 'http://localhost:3000',
        usuarios: 30,
        duracao: 60,
        rampa: 15,
        pausaMin: 1,
        pausaMax: 4,
        estresse: false,
        limpar: false,
        permitirRemoto: false,
        chefeEmail: 'chefe@teste.com',
        chefeSenha: 'senha12345',
        operadorEmail: 'operador@teste.com',
        operadorSenha: 'senha12345'
    };
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        const nome = argv[i].replace(/^--/, '').replace(/-([a-z])/g, (_, l) => l.toUpperCase());
        if (!(nome in padrao)) {
            console.error(`Parâmetro desconhecido: ${argv[i]}`);
            process.exit(1);
        }
        if (typeof padrao[nome] === 'boolean') {
            padrao[nome] = true;
        } else {
            const valor = argv[++i];
            padrao[nome] = typeof padrao[nome] === 'number' ? Number(valor) : valor;
        }
    }
    if (padrao.estresse) {
        padrao.pausaMin = 0;
        padrao.pausaMax = 0;
    }
    padrao.url = padrao.url.replace(/\/$/, '');
    return padrao;
}

const cfg = lerArgs();

const host = new URL(cfg.url).hostname;
if (!['localhost', '127.0.0.1'].includes(host) && !cfg.permitirRemoto) {
    console.error(`Recusado: ${cfg.url} não é localhost.`);
    console.error('Rodar carga contra a produção gratuita (Vercel/TiDB) pode estourar limites e derrubar o site.');
    console.error('Se for um ambiente de teste seu, repita com --permitir-remoto.');
    process.exit(1);
}

// ---------- medições ----------
const medidas = new Map(); // rota -> { tempos: [], status: {} }
let errosRede = 0;

function registrar(rota, ms, status) {
    if (!medidas.has(rota)) medidas.set(rota, { tempos: [], status: {} });
    const m = medidas.get(rota);
    m.tempos.push(ms);
    m.status[status] = (m.status[status] || 0) + 1;
}

function percentil(ordenados, p) {
    if (!ordenados.length) return 0;
    const i = Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1);
    return ordenados[Math.max(0, i)];
}

async function chamar(rota, { metodo = 'GET', token, corpo, nome } = {}) {
    const inicio = performance.now();
    let status = 'falha_rede';
    let dados = null;
    try {
        const resp = await fetch(cfg.url + rota, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: corpo ? JSON.stringify(corpo) : undefined,
            signal: AbortSignal.timeout(30000)
        });
        status = resp.status;
        const texto = await resp.text();
        try { dados = JSON.parse(texto); } catch { dados = texto; }
    } catch (err) {
        errosRede++;
        status = err.name === 'TimeoutError' ? 'timeout_30s' : 'falha_rede';
    }
    registrar(nome || `${metodo} ${rota}`, performance.now() - inicio, status);
    return { status, dados };
}

async function login(email, senha) {
    const { status, dados } = await chamar('/login', {
        metodo: 'POST',
        corpo: { usuario: email, senha },
        nome: 'POST /login'
    });
    if (status !== 200 || !dados?.token) {
        const motivo = status === 429 ? 'limite de tentativas de login (espere 1 minuto)' : JSON.stringify(dados);
        throw new Error(`Login de ${email} falhou (${status}): ${motivo}`);
    }
    return dados.token;
}

const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const pausa = () => esperar((cfg.pausaMin + Math.random() * (cfg.pausaMax - cfg.pausaMin)) * 1000);

// ---------- o que cada pessoa simulada faz ----------
// Pesos aproximados do uso real: a maioria só olha o painel/início.
const ACOES = [
    { peso: 40, nome: 'abrir painel', fn: abrirPainel },
    { peso: 20, nome: 'abrir histórico', fn: (u) => chamar('/ocorrencias', { token: u.token }) },
    { peso: 15, nome: 'abrir estoque', fn: (u) => chamar('/pecas', { token: u.token }) },
    { peso: 15, nome: 'registrar ocorrência', fn: registrarOcorrencia },
    { peso: 10, nome: 'verificar sessão', fn: (u) => chamar('/me', { token: u.token }) }
];
const PESO_TOTAL = ACOES.reduce((s, a) => s + a.peso, 0);

function sortearAcao() {
    let r = Math.random() * PESO_TOTAL;
    for (const a of ACOES) {
        if ((r -= a.peso) < 0) return a;
    }
    return ACOES[0];
}

// O painel e o início pedem as três listas ao mesmo tempo, como no navegador.
async function abrirPainel(u) {
    const inicio = performance.now();
    await Promise.all([
        chamar('/setores', { token: u.token }),
        chamar('/maquinas', { token: u.token }),
        chamar('/ocorrencias', { token: u.token })
    ]);
    registrar('PÁGINA painel (3 chamadas)', performance.now() - inicio, 'ok');
}

const SETORES = [
    ['Montagem', 'Esteira Linha A'],
    ['Qualidade', 'Calibrador Digital'],
    ['Expedição', 'Empilhadeira Elétrica'],
    ['Manutenção', 'Compressor de Ar']
];
let ocorrenciasCriadas = 0;

async function registrarOcorrencia(u) {
    const [setor, maquina] = SETORES[Math.floor(Math.random() * SETORES.length)];
    const { status } = await chamar('/cadastrar-ocorrencia', {
        metodo: 'POST',
        token: u.tokenOperador,
        corpo: {
            setor,
            maquina,
            tipo: 'Falha mecânica',
            turno: 'Manhã',
            descricao: `${MARCADOR} usuário simulado ${u.id}`
        }
    });
    if (status === 201) ocorrenciasCriadas++;
}

async function pessoa(u, fim) {
    while (Date.now() < fim) {
        await sortearAcao().fn(u);
        await pausa();
    }
}

// ---------- monitor do próprio PC que roda o teste ----------
function resumoParcial(segundos, ativos) {
    let total = 0, erros = 0;
    const tempos = [];
    for (const m of medidas.values()) {
        for (const [st, n] of Object.entries(m.status)) {
            total += n;
            if (st !== '200' && st !== '201' && st !== 'ok') erros += n;
        }
    }
    for (const [rota, m] of medidas) if (!rota.startsWith('PÁGINA')) tempos.push(...m.tempos);
    tempos.sort((a, b) => a - b);
    console.log(
        `[${String(segundos).padStart(4)}s] pessoas ativas: ${String(ativos).padStart(3)} | ` +
        `requisições: ${String(total).padStart(6)} | erros: ${erros} | ` +
        `p95 até agora: ${percentil(tempos, 95).toFixed(0)} ms`
    );
}

function relatorioFinal(duracaoReal) {
    const linhas = [];
    let total = 0, erros = 0;
    const todos = [];
    for (const [rota, m] of [...medidas].sort()) {
        const t = [...m.tempos].sort((a, b) => a - b);
        const n = t.length;
        const errosRota = Object.entries(m.status)
            .filter(([st]) => !['200', '201', 'ok'].includes(st))
            .reduce((s, [, k]) => s + k, 0);
        if (!rota.startsWith('PÁGINA')) {
            total += n;
            erros += errosRota;
            todos.push(...t);
        }
        linhas.push({
            rota,
            pedidos: n,
            'média ms': Math.round(t.reduce((s, x) => s + x, 0) / n),
            'p50 ms': Math.round(percentil(t, 50)),
            'p95 ms': Math.round(percentil(t, 95)),
            'p99 ms': Math.round(percentil(t, 99)),
            'máx ms': Math.round(t[n - 1]),
            erros: errosRota,
            status: Object.entries(m.status).map(([s, k]) => `${s}×${k}`).join(' ')
        });
    }
    todos.sort((a, b) => a - b);
    const p95 = percentil(todos, 95);
    const taxaErro = total ? (erros / total) * 100 : 0;

    console.log('\n================ RESULTADO ================');
    console.log(`Pessoas simuladas: ${cfg.usuarios} | duração: ${duracaoReal.toFixed(0)} s | modo: ${cfg.estresse ? 'ESTRESSE (sem pausas)' : `uso real (pausa de ${cfg.pausaMin}–${cfg.pausaMax} s entre cliques)`}`);
    console.log(`Requisições: ${total} (${(total / duracaoReal).toFixed(1)} por segundo) | erros: ${erros} (${taxaErro.toFixed(2)}%)`);
    console.log(`Tempo de resposta geral: p50 ${percentil(todos, 50).toFixed(0)} ms | p95 ${p95.toFixed(0)} ms | p99 ${percentil(todos, 99).toFixed(0)} ms`);
    console.log(`Ocorrências de teste criadas: ${ocorrenciasCriadas} (apague depois com --limpar)`);
    console.table(linhas);

    let veredito;
    if (taxaErro >= 1 || p95 >= 2000) veredito = 'RUIM: o sistema ficou lento ou deu erro. Veja as rotas com p95 alto e os status diferentes de 200/201.';
    else if (p95 >= 800) veredito = 'ATENÇÃO: funciona, mas as pessoas já sentiriam demora. Veja a rota mais lenta.';
    else veredito = 'BOM: respondeu rápido e sem erros com essa quantidade de pessoas.';
    console.log(`\nVeredito: ${veredito}`);
    console.log('(Referência: p95 abaixo de 800 ms e erros abaixo de 1% = experiência boa.)');

    const arquivo = path.join(__dirname, `resultado-${cfg.usuarios}usuarios-${Date.now()}.json`);
    fs.writeFileSync(arquivo, JSON.stringify({ config: cfg, duracaoReal, total, erros, p95, linhas, veredito }, null, 2));
    console.log(`Resultado salvo em ${arquivo}`);
}

async function limpar() {
    const token = await login(cfg.chefeEmail, cfg.chefeSenha);
    const { dados } = await chamar('/ocorrencias', { token });
    const deTeste = (Array.isArray(dados) ? dados : []).filter(o => String(o.descricao || '').startsWith(MARCADOR));
    console.log(`Apagando ${deTeste.length} ocorrências de teste...`);
    for (const o of deTeste) {
        await chamar(`/ocorrencias/${o.id}`, { metodo: 'DELETE', token });
    }
    console.log('Pronto.');
}

async function main() {
    const saude = await chamar('/api/health');
    if (saude.status !== 200) {
        console.error(`O sistema não respondeu em ${cfg.url}/api/health. Ele está rodando (npm start em Back-end/)?`);
        process.exit(1);
    }
    if (cfg.limpar) return limpar();

    // Só 2 logins no total: todas as pessoas simuladas reaproveitam os tokens.
    // Assim o limite de tentativas de login (10 por minuto por IP) não atrapalha.
    const token = await login(cfg.chefeEmail, cfg.chefeSenha);
    const tokenOperador = await login(cfg.operadorEmail, cfg.operadorSenha);
    medidas.clear();

    console.log(`Simulando ${cfg.usuarios} pessoas por ${cfg.duracao} s contra ${cfg.url} (entrando aos poucos em ${cfg.rampa} s)...\n`);
    const inicio = Date.now();
    const fim = inicio + (cfg.rampa + cfg.duracao) * 1000;
    let ativos = 0;
    const monitor = setInterval(() => resumoParcial(Math.round((Date.now() - inicio) / 1000), ativos), 10000);

    const tarefas = [];
    for (let i = 0; i < cfg.usuarios; i++) {
        const atraso = cfg.usuarios > 1 ? (cfg.rampa * 1000 * i) / (cfg.usuarios - 1) : 0;
        tarefas.push(esperar(atraso).then(async () => {
            ativos++;
            await pessoa({ id: i + 1, token, tokenOperador }, fim);
            ativos--;
        }));
    }
    await Promise.all(tarefas);
    clearInterval(monitor);
    relatorioFinal((Date.now() - inicio) / 1000);
}

main().catch(err => {
    console.error('Erro:', err.message);
    process.exit(1);
});
