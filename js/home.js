// home.js — lógica da página inicial (contadores, painel pessoal e pendências)

const CHEFIA = ['gerente', 'chefe_geral'];

// Atalhos do Início; "cargos" diz quem vê cada um
const ATALHOS = [
  { href: 'ocorrencia.html', icone: 'fa-triangle-exclamation', titulo: 'Registrar ocorrência', texto: 'Avise um problema em uma máquina', destaque: true },
  { href: 'painel.html', icone: 'fa-th-large', titulo: 'Painel de status', texto: 'Veja como estão as máquinas agora' },
  { href: 'historico.html', icone: 'fa-history', titulo: 'Histórico', texto: 'Consulte as ocorrências registradas', textoChefia: 'Consulte e resolva ocorrências' },
  { href: 'estoque.html', icone: 'fa-boxes', titulo: 'Estoque', texto: 'Confira as peças disponíveis', textoChefia: 'Controle as peças de manutenção' },
  { href: 'checklist.html', icone: 'fa-clipboard-check', titulo: 'Checklist', texto: 'Faça uma inspeção de manutenção', cargos: CHEFIA },
  { href: 'guindastes.html', icone: 'fa-truck-pickup', titulo: 'Guindastes', texto: 'Controle os aluguéis', cargos: CHEFIA },
  { href: 'cadastros.html', icone: 'fa-database', titulo: 'Cadastros', texto: 'Setores e máquinas', textoChefe: 'Setores, máquinas e contas', cargos: CHEFIA }
];

const ICONE_TIPO = {
  'Parada de máquina': 'fa-stop-circle',
  'Problema de qualidade': 'fa-exclamation-triangle',
  'Falta de material': 'fa-box-open',
  'Manutenção preventiva': 'fa-tools'
};

function escapeHTML(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function tempoAtras(data) {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(data).getTime()) / 60000));
  if (minutos < 1) return 'agora mesmo';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

function renderPainelPessoal(usuario) {
  const hora = new Date().getHours();
  const cumprimento = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiroNome = String(usuario.nome || '').split(' ')[0];
  document.getElementById('dashSaudacao').textContent = `${cumprimento}, ${primeiroNome}!`;
  document.getElementById('dashData').textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  document.getElementById('dashCargo').textContent = cargoLabel(usuario.cargo);

  const ehChefia = CHEFIA.includes(usuario.cargo);
  document.getElementById('atalhos').innerHTML = ATALHOS
    .filter(a => !a.cargos || a.cargos.includes(usuario.cargo))
    .map(a => {
      const texto = (usuario.cargo === 'chefe_geral' && a.textoChefe) || (ehChefia && a.textoChefia) || a.texto;
      return `
        <a href="${a.href}" class="atalho${a.destaque ? ' atalho-destaque' : ''}">
          <span class="atalho-icone"><i class="fas ${a.icone}"></i></span>
          <span class="atalho-texto"><strong>${a.titulo}</strong><small>${texto}</small></span>
        </a>`;
    }).join('');
}

function renderPendencias(ocorrencias) {
  const lista = document.getElementById('pendenciasList');
  const pendentes = ocorrencias.filter(o => o.status === 'Pendente').slice(0, 5);
  if (!pendentes.length) {
    lista.innerHTML = '<li class="pendencias-vazio"><i class="fas fa-circle-check"></i> Nenhuma pendência. Tudo funcionando!</li>';
    return;
  }
  lista.innerHTML = pendentes.map(o => `
    <li>
      <a href="historico.html?maquina=${encodeURIComponent(o.maquina)}" class="pendencia">
        <i class="fas ${ICONE_TIPO[o.tipo] || 'fa-circle-exclamation'}"></i>
        <span>
          <strong>${escapeHTML(o.tipo)} — ${escapeHTML(o.maquina)}</strong>
          <small>${escapeHTML(o.setor)} · ${tempoAtras(o.data)}</small>
        </span>
      </a>
    </li>`).join('');
}

document.addEventListener('DOMContentLoaded', async function () {
  if (!requireAuth()) return;
  try { clearNextUrl && clearNextUrl(); } catch (e) {}

  renderPainelPessoal(getSessao().usuario);

  try {
    const [resSetores, resMaquinas, resOcorrencias] = await Promise.all([
      fetch(`${API_BASE_URL}/setores`),
      fetch(`${API_BASE_URL}/maquinas`),
      fetch(`${API_BASE_URL}/ocorrencias`)
    ]);

    const setores = await resSetores.json();
    const maquinas = await resMaquinas.json();
    const ocorrencias = await resOcorrencias.json();

    document.getElementById('cnt-setores').textContent = setores.length;
    document.getElementById('cnt-maquinas').textContent = maquinas.length;
    document.getElementById('cnt-ocorrencias').textContent = ocorrencias.length;
    document.getElementById('cnt-pendentes').textContent =
      ocorrencias.filter(o => o.status === 'Pendente').length;
    renderPendencias(ocorrencias);
  } catch (erro) {
    console.error('Erro ao carregar estatísticas do servidor:', erro);
    document.getElementById('pendenciasList').innerHTML =
      '<li class="pendencias-vazio">Não foi possível carregar as pendências.</li>';
  }
});
