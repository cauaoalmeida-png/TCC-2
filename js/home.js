// home.js — lógica da página inicial (contadores, painel pessoal e pendências)

// Atalhos do Início; "grupo" diz quem vê cada um e "textos" troca a frase por cargo
const ATALHOS = [
  { href: 'ocorrencia.html', icone: 'fa-triangle-exclamation', titulo: 'Registrar ocorrência', texto: 'Avise um problema em uma máquina', textos: { operario: 'A máquina parou? Avise em segundos' }, destaque: true },
  { href: 'painel.html', icone: 'fa-th-large', titulo: 'Painel de status', texto: 'Veja como estão as máquinas agora' },
  { href: 'historico.html', icone: 'fa-history', titulo: 'Ocorrências', texto: 'Acompanhe as ocorrências registradas', textos: { operador_linha: 'Confirme paradas e designe o engenheiro', engenheiro: 'Suas ordens de conserto', admin: 'Acompanhe e resolva ocorrências' } },
  { href: 'estoque.html', icone: 'fa-boxes', titulo: 'Estoque', texto: 'Controle as peças de manutenção', grupo: 'gestao' },
  { href: 'checklist.html', icone: 'fa-clipboard-check', titulo: 'Checklist', texto: 'Faça uma inspeção de manutenção', grupo: 'gestao' },
  { href: 'guindastes.html', icone: 'fa-truck-pickup', titulo: 'Guindastes', texto: 'Controle os aluguéis', grupo: 'coordenacao' },
  { href: 'cadastros.html', icone: 'fa-database', titulo: 'Cadastros', texto: 'Setores e máquinas', textos: { admin: 'Setores, máquinas, contas e cargos' }, grupo: 'coordenacao' }
];

// O que cada cargo vê em "pendências" no Início
function pendenciasDoCargo(ocorrencias, usuario) {
  const cargo = normalizarCargo(usuario.cargo);
  const abertas = ocorrencias.filter(o => o.status === 'Pendente');
  if (cargo === 'operario') {
    return { titulo: 'Suas ocorrências em aberto', lista: abertas.filter(o => o.usuarioId === usuario.id) };
  }
  if (cargo === 'operador_linha') {
    return { titulo: 'Aguardando sua confirmação', lista: abertas.filter(o => o.fase === 'aberta') };
  }
  if (cargo === 'engenheiro') {
    return {
      titulo: 'Suas ordens de conserto',
      lista: abertas.filter(o => o.fase !== 'aberta' && (!o.responsavelId || o.responsavelId === usuario.id))
    };
  }
  return { titulo: 'Pendências recentes', lista: abertas };
}

const FASE_TEXTO = { aberta: 'Aguardando confirmação', confirmada: 'Aguardando conserto', em_conserto: 'Em conserto' };

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

  const cargo = normalizarCargo(usuario.cargo);
  document.getElementById('atalhos').innerHTML = ATALHOS
    .filter(a => !a.grupo || temCargo(a.grupo))
    .map(a => {
      const texto = (a.textos && a.textos[cargo]) || a.texto;
      return `
        <a href="${a.href}" class="atalho${a.destaque ? ' atalho-destaque' : ''}">
          <span class="atalho-icone"><i class="fas ${a.icone}"></i></span>
          <span class="atalho-texto"><strong>${a.titulo}</strong><small>${texto}</small></span>
        </a>`;
    }).join('');
}

function renderPendencias(ocorrencias) {
  const lista = document.getElementById('pendenciasList');
  const { titulo, lista: doCargo } = pendenciasDoCargo(ocorrencias, getSessao().usuario);
  const tituloEl = document.getElementById('pendenciasTitulo');
  if (tituloEl) tituloEl.innerHTML = `<i class="fas fa-clock"></i> ${escapeHTML(titulo)}`;
  const pendentes = doCargo.slice(0, 5);
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
          <small>${escapeHTML(o.setor)} · ${tempoAtras(o.data)}${FASE_TEXTO[o.fase] ? ` · ${FASE_TEXTO[o.fase]}` : ''}</small>
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
