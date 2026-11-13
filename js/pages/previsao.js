/* ============================================
   PREVISÃO DE FALHAS (tela Painel, só chefia)
   O risco vem do servidor (GET /previsao-falhas), calculado pelo histórico.
   O botão "Explicar com IA" pede à IA a explicação e a preventiva sugerida.
   ============================================ */

let previsaoDados = [];
let previsaoIA = new Map();
let previsaoMostrarTodas = false;
let previsaoCarregando = false;

const PREV_CORES = { Alto: 'red', 'Médio': 'yellow', Baixo: 'green' };
const PREV_LIMITE_CARDS = 6;

function prevEl(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined && texto !== null) el.textContent = texto;
  return el;
}

function prevDataBR(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

async function atualizarPrevisao() {
  if (typeof isOperator === 'function' && isOperator()) return;
  if (previsaoCarregando) return;
  previsaoCarregando = true;
  try {
    const resposta = await fetch(`${API_BASE_URL}/previsao-falhas`);
    if (!resposta.ok) return;
    const dados = await resposta.json();
    previsaoDados = Array.isArray(dados.maquinas) ? dados.maquinas : [];
    document.getElementById('previsaoFalhas').hidden = false;
    renderPrevisao();
    renderBadgesRisco();
    if (await iaAtiva()) document.getElementById('prevIaBtn').hidden = false;
  } catch (erro) {
    console.error('Erro ao carregar a previsão de falhas:', erro);
  } finally {
    previsaoCarregando = false;
  }
}

// Selo de risco em cada card de máquina do painel
function renderBadgesRisco() {
  const porMaquina = new Map(previsaoDados.map(p => [p.maquina, p]));
  document.querySelectorAll('[data-risco-maquina]').forEach(slot => {
    const p = porMaquina.get(slot.dataset.riscoMaquina);
    slot.replaceChildren();
    if (!p || p.nivel === 'Baixo') return;
    const badge = prevEl('span', `prev-badge ${PREV_CORES[p.nivel]}`, `Risco ${p.risco}%`);
    badge.title = `Chance de falhar nos próximos 7 dias: ${p.risco}% (${p.nivel})`;
    slot.appendChild(badge);
  });
}

function renderPrevisao() {
  const resumo = document.getElementById('prevResumo');
  const grid = document.getElementById('prevGrid');
  const contagem = { Alto: 0, 'Médio': 0, Baixo: 0 };
  previsaoDados.forEach(p => { contagem[p.nivel] = (contagem[p.nivel] || 0) + 1; });

  resumo.replaceChildren(...['Alto', 'Médio', 'Baixo'].map(nivel => {
    const chip = prevEl('span', `prev-chip ${PREV_CORES[nivel]}`);
    chip.append(prevEl('strong', null, String(contagem[nivel] || 0)), ` risco ${nivel.toLowerCase()}`);
    return chip;
  }));

  const emRisco = previsaoDados.filter(p => p.nivel !== 'Baixo' || p.paradaAgora);
  let lista = previsaoMostrarTodas ? previsaoDados : emRisco.slice(0, PREV_LIMITE_CARDS);
  const botaoTodas = document.getElementById('prevTodasBtn');
  botaoTodas.hidden = previsaoDados.length <= lista.length && !previsaoMostrarTodas;
  botaoTodas.innerHTML = previsaoMostrarTodas
    ? '<i class="fas fa-filter"></i> Só as em risco'
    : '<i class="fas fa-list"></i> Ver todas';

  if (!previsaoDados.length) {
    grid.replaceChildren(prevEl('p', 'prev-vazio', 'Cadastre máquinas e registre ocorrências para ver a previsão.'));
    return;
  }
  if (!lista.length) {
    grid.replaceChildren(prevEl('p', 'prev-vazio', 'Nenhuma máquina com risco médio ou alto agora. Bom sinal!'));
    return;
  }
  grid.replaceChildren(...lista.map(cardPrevisao));
}

function cardPrevisao(p) {
  const cor = PREV_CORES[p.nivel];
  const card = prevEl('article', `prev-card ${cor}`);

  const topo = prevEl('div', 'prev-card-topo');
  const titulo = prevEl('div');
  titulo.append(prevEl('h3', null, p.maquina), prevEl('p', 'prev-setor', p.setor));
  const medidor = prevEl('div', 'prev-risco');
  medidor.append(prevEl('strong', null, `${p.risco}%`), prevEl('span', `prev-nivel ${cor}`, `Risco ${p.nivel.toLowerCase()}`));
  topo.append(titulo, medidor);

  const barra = prevEl('div', 'prev-barra');
  const preenchido = prevEl('span', cor);
  preenchido.style.width = `${Math.max(3, p.risco)}%`;
  barra.appendChild(preenchido);
  barra.setAttribute('role', 'img');
  barra.setAttribute('aria-label', `Risco de ${p.risco}% em 7 dias`);

  card.append(topo, barra);

  const tags = prevEl('div', 'prev-tags');
  if (p.paradaAgora) tags.appendChild(prevEl('span', 'prev-tag red', 'Parada agora'));
  if (p.tendencia === 'subindo') tags.appendChild(prevEl('span', 'prev-tag yellow', '↑ Falhas aumentando'));
  if (p.tendencia === 'caindo') tags.appendChild(prevEl('span', 'prev-tag green', '↓ Falhas diminuindo'));
  if (p.poucosDados) tags.appendChild(prevEl('span', 'prev-tag', 'Poucos registros'));
  if (tags.childElementCount) card.appendChild(tags);

  const motivos = prevEl('ul', 'prev-motivos');
  p.motivos.forEach(m => motivos.appendChild(prevEl('li', null, m)));
  card.appendChild(motivos);

  const fatos = prevEl('div', 'prev-fatos');
  const fato = (rotulo, valor) => {
    if (valor === null || valor === undefined || valor === '') return;
    const f = prevEl('div');
    f.append(prevEl('span', null, rotulo), prevEl('strong', null, valor));
    fatos.appendChild(f);
  };
  fato('Falhas em 180 dias', String(p.falhas180));
  fato('Tempo médio entre falhas', p.mtbfDias ? `${Math.round(p.mtbfDias)} dias` : null);
  fato('Próxima falha estimada', p.proximaFalhaEstimada ? prevDataBR(p.proximaFalhaEstimada) : null);
  fato('Problema mais comum', p.problemaMaisComum);
  if (fatos.childElementCount) card.appendChild(fatos);

  const ia = previsaoIA.get(p.maquina);
  if (ia) {
    const bloco = prevEl('div', 'prev-ia');
    const cab = prevEl('div', 'prev-ia-cab');
    cab.append(prevEl('span', 'ia-badge', 'IA'), prevEl('span', `prev-prazo ${ia.prazo === 'Hoje' ? 'red' : ia.prazo === 'Esta semana' ? 'yellow' : 'green'}`, `Fazer: ${ia.prazo.toLowerCase()}`));
    bloco.append(cab, prevEl('p', null, ia.explicacao));
    const linha = (rotulo, texto) => {
      if (!texto) return;
      const pEl = prevEl('p');
      pEl.append(prevEl('strong', null, `${rotulo}: `), texto);
      bloco.appendChild(pEl);
    };
    linha('Causa provável', ia.causaProvavel);
    linha('Preventiva sugerida', ia.acaoPreventiva);
    if (ia.pecas && ia.pecas.length) linha('Separar peças', ia.pecas.join(', '));
    card.appendChild(bloco);
  }

  const rodape = prevEl('div', 'prev-card-rodape');
  const agendar = prevEl('a', 'btn btn-primary btn-sm');
  agendar.href = `ocorrencia.html?setor=${encodeURIComponent(p.setor)}&maquina=${encodeURIComponent(p.maquina)}&tipo=${encodeURIComponent('Manutenção preventiva')}`;
  agendar.innerHTML = '<i class="fas fa-screwdriver-wrench"></i> Registrar preventiva';
  const historico = prevEl('a', 'btn btn-light btn-sm');
  historico.href = `historico.html?maquina=${encodeURIComponent(p.maquina)}`;
  historico.innerHTML = '<i class="fas fa-history"></i> Histórico';
  rodape.append(agendar, historico);
  card.appendChild(rodape);
  return card;
}

document.getElementById('prevTodasBtn').addEventListener('click', () => {
  previsaoMostrarTodas = !previsaoMostrarTodas;
  renderPrevisao();
});

document.getElementById('prevIaBtn').addEventListener('click', async function() {
  const caixaErro = document.getElementById('prevErro');
  const visao = document.getElementById('prevVisaoIA');
  iaMostrarErro(caixaErro, '');
  iaCarregando(this, true, 'Analisando histórico...');
  const { dados, erro } = await iaChamar('/ia/previsao', {});
  iaCarregando(this, false);
  if (erro) {
    iaMostrarErro(caixaErro, erro);
    return;
  }
  previsaoIA = new Map((dados.maquinas || []).map(m => [m.maquina, m]));
  // Garante que as máquinas explicadas pela IA aparecem na lista
  const explicadas = new Set(previsaoIA.keys());
  if (!previsaoMostrarTodas && previsaoDados.some(p => explicadas.has(p.maquina) && p.nivel === 'Baixo' && !p.paradaAgora)) {
    previsaoMostrarTodas = true;
  }
  const titulo = prevEl('h4');
  titulo.append(prevEl('span', 'ia-badge', 'IA'), ' Análise da manutenção preditiva');
  visao.replaceChildren(titulo, prevEl('p', null, dados.visaoGeral));
  visao.hidden = false;
  renderPrevisao();
});
