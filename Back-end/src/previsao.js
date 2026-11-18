// ==========================================
// PREVISÃO DE FALHAS (manutenção preditiva)
// Cálculo feito pelo próprio sistema, sem IA e sem custo: olha o histórico de
// ocorrências de cada máquina e estima a chance de ela falhar nos próximos 7 dias.
// A IA (rota /ia/previsao) só explica o resultado em linguagem simples.
//
// Como funciona, em resumo:
//  1. Cada ocorrência vira um "peso de falha": parada vale 1, problema de
//     qualidade 0,6, checklist com item crítico 0,5, "Outro" 0,3. Falta de
//     material não é defeito da máquina e não conta.
//  2. Taxa de falhas por dia = 60% do ritmo dos últimos 30 dias + 40% do ritmo
//     dos últimos 180 dias (o recente pesa mais).
//  3. A taxa sobe ou desce com fatores que a manutenção conhece:
//     falha repetida (mesmo problema 2+ vezes em 30 dias), tendência de alta,
//     intervalo entre falhas encurtando (desgaste), máquina chegando no intervalo médio entre falhas (MTBF) e
//     manutenção preventiva recente (reduz).
//  4. Chance de falhar em 7 dias = 1 - e^(-7 x taxa)  (modelo de Poisson).
//     Alto a partir de 40%, Médio a partir de 20%.
// ==========================================

const DIA_MS = 24 * 60 * 60 * 1000;
const HORIZONTE_DIAS = 7;
const JANELA_RECENTE = 30;
const JANELA_BASE = 180;

const PESO_POR_TIPO = {
    'Parada de máquina': 1,
    'Problema de qualidade': 0.6,
    'Outro': 0.3,
    'Falta de material': 0
};

function ehPreventiva(tipo) {
    return /preventiva/i.test(tipo || '');
}

function ehChecklist(tipo) {
    return /checklist/i.test(tipo || '');
}

// Peso de falha de uma ocorrência (0 = não é falha da máquina).
function pesoDaOcorrencia(o) {
    if (ehPreventiva(o.tipo)) return 0;
    if (ehChecklist(o.tipo)) {
        let itens = o.itensChecklist;
        if (typeof itens === 'string') {
            try { itens = JSON.parse(itens); } catch { itens = []; }
        }
        if (!Array.isArray(itens) || !itens.length) return 0;
        const critico = itens.some(i => ['critica', 'alta'].includes(String(i?.gravidade || '').toLowerCase()));
        return critico ? 0.5 : 0.15;
    }
    return PESO_POR_TIPO[o.tipo] ?? 0.3;
}

function arred(n, casas = 1) {
    const f = 10 ** casas;
    return Math.round(n * f) / f;
}

function nivelDoRisco(risco) {
    if (risco >= 40) return 'Alto';
    if (risco >= 20) return 'Médio';
    return 'Baixo';
}

// Calcula o risco de cada máquina.
//   maquinas:    [{ nomeMaquina, setorAssociado, criadoEm? }]
//   ocorrencias: [{ maquina, tipo, data, status, itensChecklist? }]
//   agora:       Date (para testes)
function preverFalhas(maquinas, ocorrencias, agora = new Date()) {
    const hoje = agora.getTime();
    const porMaquina = new Map();
    for (const o of ocorrencias) {
        if (!porMaquina.has(o.maquina)) porMaquina.set(o.maquina, []);
        porMaquina.get(o.maquina).push(o);
    }

    const resultado = maquinas.map(m => {
        const lista = (porMaquina.get(m.nomeMaquina) || [])
            .map(o => ({ ...o, quando: new Date(o.data).getTime() }))
            .filter(o => Number.isFinite(o.quando) && o.quando <= hoje)
            .sort((a, b) => a.quando - b.quando);

        const idadeDias = o => (hoje - o.quando) / DIA_MS;
        const falhas = lista.map(o => ({ ...o, peso: pesoDaOcorrencia(o) })).filter(o => o.peso > 0);
        const falhas180 = falhas.filter(o => idadeDias(o) <= JANELA_BASE);
        const falhas30 = falhas180.filter(o => idadeDias(o) <= JANELA_RECENTE);
        const soma = arr => arr.reduce((t, o) => t + o.peso, 0);

        // Quantos dias de histórico a máquina tem (no máximo 180), para não
        // diluir a taxa de uma máquina cadastrada há pouco tempo.
        const primeiroRegistro = Math.min(
            lista.length ? lista[0].quando : hoje,
            m.criadoEm ? new Date(m.criadoEm).getTime() : hoje
        );
        const diasDeHistorico = Math.min(JANELA_BASE, Math.max(JANELA_RECENTE, (hoje - primeiroRegistro) / DIA_MS));

        const taxaRecente = soma(falhas30) / JANELA_RECENTE;
        const taxaBase = soma(falhas180) / diasDeHistorico;
        let taxa = 0.6 * taxaRecente + 0.4 * taxaBase;

        const motivos = [];
        const paradas = falhas180.filter(o => o.tipo === 'Parada de máquina');
        const paradasRecentes = paradas.filter(o => idadeDias(o) <= JANELA_RECENTE).length;
        if (falhas30.length) {
            motivos.push(`${falhas30.length} ${falhas30.length === 1 ? 'falha' : 'falhas'} nos últimos 30 dias` +
                (paradasRecentes ? ` (${paradasRecentes} ${paradasRecentes === 1 ? 'parada' : 'paradas'})` : ''));
        }

        // Problema que mais se repete na máquina
        const contagemTipos = new Map();
        for (const o of falhas180) contagemTipos.set(o.tipo, (contagemTipos.get(o.tipo) || 0) + 1);
        const [problemaMaisComum = null] = [...contagemTipos.entries()].sort((a, b) => b[1] - a[1])[0] || [];

        // Fator 1: mesmo problema 2 ou mais vezes em 30 dias
        const tipos30 = new Map();
        for (const o of falhas30) tipos30.set(o.tipo, (tipos30.get(o.tipo) || 0) + 1);
        const repetida = [...tipos30.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0];
        if (repetida) {
            taxa *= 1.3;
            motivos.push(`falha repetida: "${repetida[0]}" ${repetida[1]} vezes em 30 dias`);
        }

        // Fator 2: tendência (últimos 30 dias contra a média dos 150 dias anteriores)
        const anteriores = falhas180.filter(o => idadeDias(o) > JANELA_RECENTE);
        const mediaAnterior = soma(anteriores) / Math.max(1, (diasDeHistorico - JANELA_RECENTE) / JANELA_RECENTE);
        let tendencia = 'estável';
        if (soma(falhas30) >= 1 && soma(falhas30) > mediaAnterior * 1.5) {
            tendencia = 'subindo';
            taxa *= 1.2;
            motivos.push('as falhas aumentaram em relação aos meses anteriores');
        } else if (anteriores.length && soma(falhas30) < mediaAnterior * 0.5) {
            tendencia = 'caindo';
        }

        // Fator 3: intervalo médio entre falhas (MTBF), usando paradas e problemas de qualidade
        const falhasFortes = falhas180.filter(o => o.peso >= 0.6);
        let mtbfDias = null;
        let proximaFalhaEstimada = null;
        const ultimaFalha = falhas.length ? falhas[falhas.length - 1] : null;
        const diasDesdeUltima = ultimaFalha ? Math.floor(idadeDias(ultimaFalha)) : null;
        if (falhasFortes.length >= 2) {
            const intervalos = [];
            for (let i = 1; i < falhasFortes.length; i++) {
                intervalos.push((falhasFortes[i].quando - falhasFortes[i - 1].quando) / DIA_MS);
            }
            // Média ponderada: os intervalos mais recentes pesam mais.
            const pesos = intervalos.map((_, i) => i + 1);
            mtbfDias = Math.max(1, intervalos.reduce((t, n, i) => t + n * pesos[i], 0) / pesos.reduce((t, n) => t + n, 0));
            // Intervalos encurtando = desgaste avançando.
            if (intervalos.length >= 3) {
                const ultimo = intervalos[intervalos.length - 1];
                const antes = intervalos.slice(0, -1);
                const mediaAntes = antes.reduce((t, n) => t + n, 0) / antes.length;
                if (ultimo < mediaAntes * 0.6) {
                    taxa *= 1.25;
                    tendencia = 'subindo';
                    motivos.push(`o intervalo entre falhas está encurtando (de ${Math.round(mediaAntes)} para ${Math.round(ultimo)} dias), sinal de desgaste`);
                }
            }
            const ultimaForte = falhasFortes[falhasFortes.length - 1];
            const diasDesdeForte = idadeDias(ultimaForte);
            proximaFalhaEstimada = new Date(ultimaForte.quando + mtbfDias * DIA_MS).toISOString().slice(0, 10);
            if (diasDesdeForte >= mtbfDias * 0.8) {
                taxa *= 1.15;
                motivos.push(diasDesdeForte >= mtbfDias
                    ? `já passou do intervalo médio entre falhas (${Math.round(mtbfDias)} dias)`
                    : `está chegando no intervalo médio entre falhas (${Math.round(mtbfDias)} dias)`);
            }
        }

        // Fator 4: manutenção preventiva recente reduz o risco
        const preventivas = lista.filter(o => ehPreventiva(o.tipo));
        const ultimaPreventiva = preventivas.length ? preventivas[preventivas.length - 1] : null;
        const diasDesdePreventiva = ultimaPreventiva ? Math.floor(idadeDias(ultimaPreventiva)) : null;
        if (ultimaPreventiva && diasDesdePreventiva <= 15 && (!ultimaFalha || ultimaPreventiva.quando > ultimaFalha.quando)) {
            taxa *= 0.7;
            motivos.push(`preventiva feita há ${diasDesdePreventiva} ${diasDesdePreventiva === 1 ? 'dia' : 'dias'} (reduz o risco)`);
        }

        const paradaAgora = lista.some(o => o.tipo === 'Parada de máquina' && o.status === 'Pendente');
        const risco = Math.min(99, Math.round(100 * (1 - Math.exp(-HORIZONTE_DIAS * taxa))));
        const poucosDados = falhas.length < 2;
        if (!motivos.length) {
            motivos.push(falhas.length ? 'sem falhas recentes' : 'nenhuma falha registrada');
        }

        return {
            maquina: m.nomeMaquina,
            setor: m.setorAssociado,
            risco,
            nivel: nivelDoRisco(risco),
            paradaAgora,
            poucosDados,
            tendencia,
            falhas30: falhas30.length,
            falhas180: falhas180.length,
            paradas180: paradas.length,
            mtbfDias: mtbfDias === null ? null : arred(mtbfDias),
            diasDesdeUltima,
            diasDesdePreventiva,
            proximaFalhaEstimada,
            problemaMaisComum,
            motivos
        };
    });

    return resultado.sort((a, b) => b.risco - a.risco || b.falhas180 - a.falhas180 || a.maquina.localeCompare(b.maquina));
}

module.exports = { preverFalhas, pesoDaOcorrencia, HORIZONTE_DIAS };
