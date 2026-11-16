  document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    try { clearNextUrl && clearNextUrl(); } catch (e) {}

    // Operador só consulta: a exportação some e os cartões não mostram botões de ação
    if (isOperator()) {
      const exportar = document.querySelector('button[onclick="abrirExportacao()"]');
      if (exportar) exportar.closest('.toolbar').remove();
    }
  });

  let resolvendoId = null;
  let historicoAtual = []; // Variável global para armazenar dados do banco

  function tipoIcon(tipo) {
    const map = {
      'Parada de máquina': 'fa-stop-circle',
      'Problema de qualidade': 'fa-exclamation-triangle',
      'Falta de material': 'fa-box-open',
      'Manutenção preventiva': 'fa-tools',
      'Outro': 'fa-question-circle'
    };
    return map[tipo] || 'fa-circle';
  }

  const TEMPO_OCULTAR_MS = 10 * 60 * 1000;
  let mostrarResolvidos = false;
  let timerInterval = null;

  function tempoRestante(dataResolucao) {
    const diff = TEMPO_OCULTAR_MS - (Date.now() - new Date(dataResolucao).getTime());
    return diff > 0 ? diff : 0;
  }

  function formatarTimer(ms) {
    const min = Math.floor(ms / 60000);
    const seg = Math.floor((ms % 60000) / 1000);
    return `${min}:${seg.toString().padStart(2,'0')}`;
  }

  // BUSCAR do Banco de Dados e Renderizar
  async function renderHistorico() {
    try {
        const resposta = await fetch(`${API_BASE_URL}/ocorrencias`);
        historicoAtual = await resposta.json();
    } catch (erro) {
        console.error('Erro ao buscar do servidor:', erro);
        document.getElementById('historicoList').innerHTML = `<div class="empty-state">Erro ao carregar dados do servidor.</div>`;
        return;
    }

    const maquinaURL = new URLSearchParams(window.location.search).get('maquina');
    let todas = maquinaURL ? historicoAtual.filter(o => o.maquina === maquinaURL) : [...historicoAtual];
    const fSetor  = document.getElementById('filterSetor').value;
    const fTipo   = document.getElementById('filterTipo').value;
    const fStatus = document.getElementById('filterStatus').value;
    const fTurno  = document.getElementById('filterTurno').value;

    let pendentes  = todas.filter(o => o.status === 'Pendente');
    let resolvidos = todas.filter(o => o.status === 'Resolvido');

    const resolvidosVisiveis   = resolvidos.filter(o => tempoRestante(o.dataResolucao || o.data) > 0);
    const resolvidosOcultos    = resolvidos.filter(o => tempoRestante(o.dataResolucao || o.data) === 0);

    if (fSetor)  { pendentes = pendentes.filter(o => o.setor === fSetor); resolvidos = resolvidos.filter(o => o.setor === fSetor); }
    if (fTipo)   { pendentes = pendentes.filter(o => o.tipo  === fTipo);  resolvidos = resolvidos.filter(o => o.tipo  === fTipo);  }
    if (fTurno)  { pendentes = pendentes.filter(o => o.turno === fTurno); resolvidos = resolvidos.filter(o => o.turno === fTurno); }

    let listaVisivel = [
      ...pendentes,
      ...resolvidosVisiveis.filter(o =>
        (!fSetor  || o.setor  === fSetor)  &&
        (!fTipo   || o.tipo   === fTipo)   &&
        (!fTurno  || o.turno  === fTurno)
      )
    ].sort((a, b) => new Date(b.data) - new Date(a.data));

    if (fStatus === 'Resolvido') listaVisivel = resolvidos.sort((a,b) => new Date(b.data)-new Date(a.data));
    if (fStatus === 'Pendente')  listaVisivel = pendentes.sort((a,b) => new Date(b.data)-new Date(a.data));
    if (FASES[fStatus]) listaVisivel = pendentes.filter(o => o.fase === fStatus).sort((a,b) => new Date(b.data)-new Date(a.data));

    document.getElementById('summaryBar').innerHTML = `
      ${maquinaURL ? `<a class="summary-pill summary-filtro" href="historico.html" title="Mostrar todas as máquinas"><i class="fas fa-filter"></i> ${escapeHTML(maquinaURL)} <i class="fas fa-xmark"></i></a>` : ''}
      <div class="summary-pill"><span class="num pendente">${todas.filter(o=>o.fase==='aberta').length}</span> Aguardando confirmação</div>
      <div class="summary-pill"><span class="num aguardando">${todas.filter(o=>o.fase==='confirmada').length}</span> Aguardando conserto</div>
      <div class="summary-pill"><span class="num conserto">${todas.filter(o=>o.fase==='em_conserto').length}</span> Em conserto</div>
      <div class="summary-pill"><span class="num resolvida">${todas.filter(o=>o.status==='Resolvido').length}</span> Resolvidas</div>
      <div class="summary-pill"><span class="num total">${todas.length}</span> Total</div>
      ${resolvidosOcultos.length > 0 ? `
        <button type="button" class="summary-pill summary-toggle${mostrarResolvidos ? ' active' : ''}" onclick="toggleResolvidos()">
          <i class="fas fa-eye${mostrarResolvidos?'-slash':''}"></i>
          ${mostrarResolvidos ? 'Ocultar' : 'Ver'} resolvidos (${resolvidosOcultos.length})
        </button>` : ''}
    `;

    const container = document.getElementById('historicoList');
    let html = '';

    if (!listaVisivel.length && !(mostrarResolvidos && resolvidosOcultos.length)) {
      html = `<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>Nenhuma ocorrência encontrada.</p></div>`;
    } else {
      html = listaVisivel.map(o => renderCard(o)).join('');
    }

    if (mostrarResolvidos && resolvidosOcultos.length) {
      const resolvidosFiltrados = resolvidosOcultos.filter(o =>
        (!fSetor  || o.setor  === fSetor)  &&
        (!fTipo   || o.tipo   === fTipo)   &&
        (!fTurno  || o.turno  === fTurno)
      );
      if (resolvidosFiltrados.length) {
        html += `
          <div class="hist-ocultos-banner">
            <i class="fas fa-check-circle"></i>
            <span>Ocorrências já concluídas (ocultas automaticamente após 10 min)</span>
          </div>
          ${resolvidosFiltrados.map(o => renderCard(o)).join('')}
        `;
      }
    }

    container.innerHTML = html;

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      resolvidosVisiveis.forEach(o => {
        const el = document.getElementById(`timer-${o.id}`);
        if (el) {
          const rest = tempoRestante(o.dataResolucao || o.data);
          if (rest <= 0) { renderHistorico(); return; }
          el.textContent = `Sumindo em ${formatarTimer(rest)}`;
        }
      });
    }, 1000);
  }

  function renderCard(o) {
    const isPendente = o.status === 'Pendente';
    const resto = tempoRestante(o.dataResolucao || o.data);
    const mostrandoTimer = !isPendente && resto > 0;

    // Para evitar erro na formatação de data caso ela não passe pela função local
    const dataFormatada = o.data ? new Date(o.data).toLocaleString('pt-BR') : '-';

    return `
      <div class="hist-card ${isPendente ? 'pendente' : 'resolvido'} fase-${o.fase}">
        <div class="hist-card-header">
          <div>
            <h3><i class="fas ${tipoIcon(o.tipo)}"></i> ${escapeHTML(o.tipo)} — ${escapeHTML(o.maquina)}</h3>
            <p>${escapeHTML(o.setor)}</p>
          </div>
          <div class="hist-badges">
            <span class="badge ${FASES[o.fase]?.badge || 'badge-success'}"><i class="fas ${FASES[o.fase]?.icone || 'fa-check'}"></i> ${FASES[o.fase]?.texto || 'Resolvido'}</span>
            ${mostrandoTimer ? `<span id="timer-${o.id}" class="hist-timer"><i class="fas fa-hourglass-half"></i> Sumindo em ${formatarTimer(resto)}</span>` : ''}
          </div>
        </div>
        <div class="hist-card-meta">
          <span><i class="fas fa-calendar"></i> ${dataFormatada}</span>
          <span><i class="fas fa-user"></i> ${escapeHTML(o.usuario?.usuario && o.usuario.usuario !== o.operador ? `${o.operador} (${o.usuario.usuario})` : o.operador)}</span>
          <span><i class="fas fa-clock"></i> Turno: ${escapeHTML(o.turno)}</span>
        </div>
        <div class="hist-card-desc">${escapeHTML(o.descricao)}</div>
        ${renderFases(o)}
        ${renderOrdem(o)}
        ${o.resolucao ? `<div class="hist-card-resolucao"><i class="fas fa-check-circle"></i> <strong>Resolução:</strong> ${escapeHTML(o.resolucao)}${o.concluidoPor ? ` <small>(por ${escapeHTML(o.concluidoPor)})</small>` : ''}</div>` : ''}
        ${o.pecasUsadas?.length ? `<div class="hist-pecas"><i class="fas fa-boxes"></i> <strong>Peças usadas:</strong> ${o.pecasUsadas.map(p => `${escapeHTML(p.quantidade)} ${escapeHTML(p.unidade || 'un')} de ${escapeHTML(p.nome)}`).join(', ')}</div>` : ''}
        ${renderAcoes(o, isPendente)}
      </div>
    `;
}

  // ==========================================
  // FASES DA OCORRÊNCIA
  // aberta (operário avisou) → confirmada (operador confirmou e designou)
  // → em_conserto (engenheiro começou) → resolvida
  // ==========================================
  const FASES = {
    aberta: { texto: 'Aguardando confirmação', badge: 'badge-danger', icone: 'fa-bell' },
    confirmada: { texto: 'Aguardando conserto', badge: 'badge-warning', icone: 'fa-user-gear' },
    em_conserto: { texto: 'Em conserto', badge: 'badge-info', icone: 'fa-screwdriver-wrench' }
  };

  function duracao(inicio, fim) {
    if (!inicio || !fim) return '';
    const min = Math.max(0, Math.round((new Date(fim) - new Date(inicio)) / 60000));
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} h ${min % 60} min`;
    return `${Math.floor(h / 24)} d ${h % 24} h`;
  }

  function hora(data) {
    return data ? new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  }

  // Linha do tempo com o tempo gasto em cada fase (aviso, atendimento e conserto)
  function renderFases(o) {
    if (o.itensChecklist) return '';
    const agora = new Date().toISOString();
    const fim = o.dataResolucao;
    const etapas = [
      { nome: 'Aviso', quando: o.data, quem: o.operador, feita: true },
      { nome: 'Confirmação', quando: o.dataConfirmacao, quem: o.confirmadoPor,
        dur: duracao(o.data, o.dataConfirmacao || (o.fase === 'aberta' ? agora : null)),
        feita: !!o.dataConfirmacao, atual: o.fase === 'aberta' },
      { nome: 'Início do conserto', quando: o.dataInicioConserto, quem: o.dataInicioConserto ? o.responsavelNome : '',
        dur: duracao(o.dataConfirmacao || o.data, o.dataInicioConserto || (o.fase === 'confirmada' ? agora : null)),
        feita: !!o.dataInicioConserto, atual: o.fase === 'confirmada' },
      { nome: 'Resolvida', quando: fim, quem: o.concluidoPor,
        dur: duracao(o.dataInicioConserto || o.dataConfirmacao || o.data, fim || (o.fase === 'em_conserto' ? agora : null)),
        feita: !!fim, atual: o.fase === 'em_conserto' }
    ];
    const total = duracao(o.data, fim || agora);
    return `
      <ul class="hist-fases" aria-label="Fases da ocorrência">
        ${etapas.map(e => `
          <li class="hist-fase${e.feita ? ' feita' : ''}${e.atual ? ' atual' : ''}">
            <strong>${e.nome}</strong>
            <span>${e.quando ? hora(e.quando) : (e.atual ? 'aguardando…' : '—')}</span>
            ${e.dur ? `<span class="dur">${e.atual ? 'há ' : ''}${e.dur}</span>` : ''}
            ${e.quem ? `<span>${escapeHTML(e.quem)}</span>` : ''}
          </li>`).join('')}
        <li class="hist-fase${fim ? ' feita' : ''}"><strong>Tempo total</strong><span class="dur">${total}</span><span>${fim ? 'máquina liberada' : 'ainda parada'}</span></li>
      </ul>`;
  }

  function renderOrdem(o) {
    if (!o.responsavelNome && !o.orientacao) return '';
    return `
      <div class="hist-ordem">
        ${o.responsavelNome ? `<p><i class="fas fa-user-gear"></i> <strong>Engenheiro:</strong> ${escapeHTML(o.responsavelNome)}</p>` : ''}
        ${o.orientacao ? `<p><i class="fas fa-comment-dots"></i> <strong>Orientação do operador:</strong> ${escapeHTML(o.orientacao)}</p>` : ''}
      </div>`;
  }

  // Botões de cada cargo, conforme a fase
  function renderAcoes(o, isPendente) {
    if (isOperator()) return '';
    const eu = getSessao().usuario.id;
    const ordemMinha = !o.responsavelId || o.responsavelId === eu || temCargo('admin');
    const botoes = [];
    if (isPendente && o.fase === 'aberta' && temCargo('coordenacao')) {
      botoes.push(`<button class="btn btn-primary btn-sm" onclick="abrirModalConfirmar(${o.id})"><i class="fas fa-clipboard-check"></i> Confirmar parada</button>`);
    }
    if (isPendente && o.fase !== 'em_conserto' && temCargo('manutencao') && ordemMinha) {
      botoes.push(`<button class="btn btn-outline btn-sm" onclick="iniciarConserto(${o.id})"><i class="fas fa-screwdriver-wrench"></i> Iniciar conserto</button>`);
    }
    if (isPendente && temCargo('manutencao') && ordemMinha) {
      botoes.push(`<button class="btn btn-success btn-sm" onclick="abrirModal(${o.id})"><i class="fas fa-check"></i> Concluir conserto</button>`);
    }
    if (isPendente) {
      botoes.push(`<a href="checklist.html?setor=${encodeURIComponent(o.setor)}&amp;maquina=${encodeURIComponent(o.maquina)}" class="btn btn-outline btn-sm"><i class="fas fa-plus"></i> Novo Checklist</a>`);
    }
    if (temCargo('coordenacao')) {
      botoes.push(`<button onclick="excluirRegistro(${o.id})" class="btn btn-danger btn-sm btn-push-right"><i class="fas fa-trash"></i> Excluir</button>`);
    }
    return botoes.length ? `<div class="hist-card-footer">${botoes.join('')}</div>` : '';
  }

  // Operador da linha: confirma a parada e escolhe o engenheiro
  let confirmandoId = null;

  async function abrirModalConfirmar(id) {
    confirmandoId = id;
    const o = historicoAtual.find(x => x.id === id);
    document.getElementById('confirmarResumo').textContent = o ? `${o.tipo} — ${o.maquina} (${o.setor}), avisado por ${o.operador}.` : '';
    document.getElementById('confirmarOrientacao').value = '';
    const sel = document.getElementById('confirmarEngenheiro');
    sel.innerHTML = '<option value="">Carregando…</option>';
    document.getElementById('modalConfirmar').classList.add('open');
    try {
      const resposta = await fetch(`${API_BASE_URL}/usuarios/engenheiros`);
      const engenheiros = resposta.ok ? await resposta.json() : [];
      sel.replaceChildren();
      const vazio = document.createElement('option');
      vazio.value = '';
      vazio.textContent = engenheiros.length ? 'Qualquer engenheiro disponível' : 'Nenhum engenheiro cadastrado';
      sel.appendChild(vazio);
      engenheiros.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.nome;
        sel.appendChild(opt);
      });
    } catch (erro) {
      sel.innerHTML = '<option value="">Qualquer engenheiro disponível</option>';
    }
  }

  function fecharModalConfirmar() {
    document.getElementById('modalConfirmar').classList.remove('open');
    confirmandoId = null;
  }

  async function enviarConfirmacao() {
    const responsavelId = document.getElementById('confirmarEngenheiro').value;
    const orientacao = document.getElementById('confirmarOrientacao').value.trim();
    try {
      const resposta = await fetch(`${API_BASE_URL}/ocorrencias/${confirmandoId}/confirmar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsavelId: responsavelId ? Number(responsavelId) : null, orientacao })
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) { avisar(dados.erro || 'Não foi possível confirmar.', 'erro'); return; }
      fecharModalConfirmar();
      avisar(dados.mensagem || 'Parada confirmada.', 'sucesso');
      renderHistorico();
    } catch (erro) {
      avisar('Erro ao comunicar com o servidor.', 'erro');
    }
  }

  // Engenheiro: recebe a ordem e começa o conserto
  async function iniciarConserto(id) {
    try {
      const resposta = await fetch(`${API_BASE_URL}/ocorrencias/${id}/iniciar-conserto`, { method: 'PUT' });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) { avisar(dados.erro || 'Não foi possível iniciar o conserto.', 'erro'); return; }
      avisar('Conserto iniciado. O tempo de conserto está contando.', 'sucesso');
      renderHistorico();
    } catch (erro) {
      avisar('Erro ao comunicar com o servidor.', 'erro');
    }
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function toggleResolvidos() {
    mostrarResolvidos = !mostrarResolvidos;
    renderHistorico();
      }

// 🟢 Função de exclusão aprimorada com diagnóstico
async function excluirRegistro(id) {
    if (!id) {
        avisar("Erro: ID do registro não foi encontrado.");
        return;
    }

    if (await confirmar(`Tem certeza que deseja excluir a ocorrência #${id}? Essa ação não pode ser desfeita.`, { titulo: 'Excluir ocorrência', ok: 'Excluir', perigo: true })) {
        try {
            // Garante o endereço correto do backend
            const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:3000';
            const url = `${baseUrl}/ocorrencias/${id}`;

            console.log("Tentando excluir na URL:", url); // Para conferir no F12

            const resposta = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (resposta.ok) {
                avisar("Ocorrência excluída com sucesso!");
                renderHistorico(); // Recarrega a tela do histórico
            } else {
                const erroDados = await resposta.json().catch(() => ({}));
                avisar(`Erro (${resposta.status}): ${erroDados.erro || 'Servidor recusou a exclusão.'}`);
            }
        } catch (erro) {
            console.error("Erro de conexão:", erro);
            avisar("Erro de conexão! Verifique se o servidor Node.js está rodando.");
        }
    }
}

  function abrirModal(id) {
    resolvendoId = id;
    document.getElementById('resolucaoInput').value = '';
    pecasUsadas = [];
    renderPecasUsadas();
    carregarPecasEstoque();
    limparSugestaoIA();
    iaAtiva().then(ativa => { document.getElementById('iaSolucaoBox').hidden = !ativa; });
    document.getElementById('modalOverlay').classList.add('open');
  }

  function fecharModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    resolvendoId = null;
  }

  // ATUALIZAR STATUS NO BANCO
  async function confirmarResolucao() {
    const texto = document.getElementById('resolucaoInput').value.trim();
    if (!texto) { avisar('Por favor, descreva o que foi feito.'); return; }
    
    const dataAtual = new Date().toISOString();

    try {
        const resposta = await fetch(`${API_BASE_URL}/resolver-ocorrencia/${resolvendoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resolucao: texto,
              dataResolucao: dataAtual,
              // As peças saem do estoque no servidor, junto com o fechamento
              pecasUsadas: pecasUsadas.map(p => ({ pecaId: p.pecaId, quantidade: p.quantidade }))
            })
        });
        if (!resposta.ok) {
            const erro = await resposta.json().catch(() => ({}));
            avisar(erro.erro || 'Não foi possível marcar como resolvido.', 'erro');
            return;
        }
        fecharModal();
        avisar('Conserto concluído e ocorrência fechada.', 'sucesso');
        renderHistorico(); // Recarrega da base de dados
    } catch (erro) {
        avisar('Erro ao comunicar com o servidor.');
    }
  }

  // ALIMENTAR O FILTRO COM OS SETORES DO BANCO
  async function initFiltros() {
    try {
        const resposta = await fetch(`${API_BASE_URL}/setores`);
        const setores = await resposta.json();
        const sel = document.getElementById('filterSetor');
        setores.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.nome_setor; opt.textContent = s.nome_setor;
            sel.appendChild(opt);
        });
    } catch (erro) {
        console.error("Erro ao carregar os filtros de setor.");
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Permite abrir já filtrado, ex.: historico.html?status=Pendente (link do Início)
    const statusURL = new URLSearchParams(window.location.search).get('status');
    if (statusURL) document.getElementById('filterStatus').value = statusURL;
    initFiltros();
    renderHistorico();
  });

// ==========================================
// EXPORTAÇÃO AVANÇADA (BUSCANDO DO BANCO)
// ==========================================
function abrirExportacao() {
  const modal = document.createElement('div');
  modal.id = 'exportModal';
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal">
      <h3><i class="fas fa-file-excel text-success"></i> Exportar para Excel</h3>
      <p class="modal-text">Selecione o que deseja exportar:</p>
      <div class="export-options">
        <label class="export-option">
          <input type="checkbox" id="expOcorrencias" checked>
          <span><strong>Histórico de Ocorrências</strong><small>Todas as ocorrências e checklists registrados</small></span>
        </label>
        <label class="export-option">
          <input type="checkbox" id="expEstoque" checked>
          <span><strong>Estoque de Peças</strong><small>Lista completa de peças e quantidades</small></span>
        </label>
        <label class="export-option">
          <input type="checkbox" id="expCadastros" checked>
          <span><strong>Cadastros (Setores e Máquinas)</strong><small>Lista de setores e máquinas cadastradas</small></span>
        </label>
      </div>
      <div class="modal-buttons">
        <button onclick="confirmarExportacao()" class="btn btn-success" id="btnExportar">
          <i class="fas fa-download"></i> Exportar
        </button>
        <button onclick="document.getElementById('exportModal').remove()" class="btn btn-cancel">
          Cancelar
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function confirmarExportacao() {
  const expOc  = document.getElementById('expOcorrencias').checked;
  const expEst = document.getElementById('expEstoque').checked;
  const expCad = document.getElementById('expCadastros').checked;

  if (!expOc && !expEst && !expCad) { avisar('Selecione pelo menos uma opção.'); return; }

  const btn = document.getElementById('btnExportar');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
  btn.style.pointerEvents = 'none';

  try {
      const wb = XLSX.utils.book_new();

      if (expOc) {
        const resOc = await fetch(`${API_BASE_URL}/ocorrencias`);
        const ocorrencias = await resOc.json();
        const ocPlanilha = ocorrencias.map(o => ({
          'ID': o.id,
          'Data': o.data ? new Date(o.data).toLocaleString('pt-BR') : '-',
          'Setor': o.setor,
          'Máquina': o.maquina,
          'Tipo': o.tipo,
          'Operador': o.operador,
          'Turno': o.turno,
          'Descrição': o.descricao,
          'Status': o.status,
          'Fase': o.fase === 'resolvida' ? 'Resolvida' : (FASES[o.fase]?.texto || '-'),
          'Confirmada em': o.dataConfirmacao ? new Date(o.dataConfirmacao).toLocaleString('pt-BR') : '-',
          'Confirmada por': o.confirmadoPor || '-',
          'Engenheiro': o.responsavelNome || '-',
          'Início do conserto': o.dataInicioConserto ? new Date(o.dataInicioConserto).toLocaleString('pt-BR') : '-',
          'Resolvida em': o.dataResolucao ? new Date(o.dataResolucao).toLocaleString('pt-BR') : '-',
          'Tempo até confirmar': duracao(o.data, o.dataConfirmacao) || '-',
          'Tempo de conserto': duracao(o.dataInicioConserto, o.dataResolucao) || '-',
          'Tempo total parado': duracao(o.data, o.dataResolucao) || '-',
          'Peças usadas': (o.pecasUsadas || []).map(p => `${p.quantidade} ${p.unidade || 'un'} ${p.nome}`).join('; ') || '-',
          'Resolução': o.resolucao || '-'
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ocPlanilha), 'Ocorrências');
      }

      if (expEst) {
        const resPecas = await fetch(`${API_BASE_URL}/pecas`);
        const pecas = await resPecas.json();
        const pecasPlanilha = pecas.map(p => ({
          'ID': p.id,
          'Peça': p.nome,
          'Categoria': p.categoria,
          'Quantidade Atual': p.qtd,
          'Estoque Mínimo': p.min,
          'Unidade': p.unidade,
          'Status': p.qtd <= p.min ? 'ABAIXO DO MÍNIMO' : 'OK'
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pecasPlanilha), 'Estoque');
      }

      if (expCad) {
        const resSetores = await fetch(`${API_BASE_URL}/setores`);
        const setores = await resSetores.json();
        const resMaquinas = await fetch(`${API_BASE_URL}/maquinas`);
        const maquinas = await resMaquinas.json();

        const setoresPlanilha = setores.map(s => ({ 'ID': s.id, 'Setor': s.nome_setor, 'Responsável': s.responsavel }));
        const maquinasPlanilha = maquinas.map(m => ({ 'ID': m.id, 'Máquina': m.nome_maquina, 'Setor': m.setor_associado, 'Série': m.numero_serie || '-' }));
        
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(setoresPlanilha), 'Setores');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(maquinasPlanilha), 'Máquinas');
      }

      const dataStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      XLSX.writeFile(wb, `FactoryTrack_${dataStr}.xlsx`);
      document.getElementById('exportModal').remove();

  } catch (error) {
      avisar("Erro ao buscar dados do servidor para a exportação!");
      btn.innerHTML = '<i class="fas fa-download"></i> Exportar';
      btn.style.pointerEvents = 'auto';
  }
}

  // ==========================================
  // SUGESTÃO DE SOLUÇÃO COM IA (modal de resolução)
  // A IA olha casos parecidos já resolvidos e sugere o texto e as peças usadas.
  // ==========================================
  let pecasSugeridasIA = [];

  function limparSugestaoIA() {
    pecasSugeridasIA = [];
    iaMostrarErro(document.getElementById('iaSolucaoErro'), '');
    document.getElementById('iaSolucaoResultado').hidden = true;
    document.getElementById('iaSolucaoPecas').replaceChildren();
  }

  async function sugerirSolucaoIA() {
    const botao = document.getElementById('iaSolucaoBtn');
    const caixaErro = document.getElementById('iaSolucaoErro');
    limparSugestaoIA();
    iaCarregando(botao, true);
    const { dados, erro } = await iaChamar('/ia/solucao', { ocorrenciaId: resolvendoId });
    iaCarregando(botao, false);
    if (erro) {
      iaMostrarErro(caixaErro, erro);
      return;
    }

    document.getElementById('resolucaoInput').value = dados.solucao;
    document.getElementById('iaSolucaoBase').textContent = dados.baseadoEm;
    pecasSugeridasIA = dados.pecas || [];

    // As peças sugeridas entram na lista de peças usadas (dá para tirar antes de concluir)
    pecasSugeridasIA.forEach(p => {
      if (Number.isInteger(p.pecaId) && p.quantidade > 0) adicionarPeca(p.pecaId, p.nome, p.quantidade, p.unidade);
    });
    if (pecasSugeridasIA.length) {
      const aviso = document.createElement('p');
      aviso.textContent = 'As peças sugeridas foram adicionadas em "Peças usadas" abaixo.';
      document.getElementById('iaSolucaoPecas').appendChild(aviso);
    }
    document.getElementById('iaSolucaoResultado').hidden = false;
  }

  // ==========================================
  // PEÇAS USADAS NO CONSERTO
  // ==========================================
  let pecasUsadas = [];
  let pecasEstoque = [];

  async function carregarPecasEstoque() {
    const sel = document.getElementById('pecaUsadaSelect');
    try {
      const resposta = await fetch(`${API_BASE_URL}/pecas`);
      pecasEstoque = resposta.ok ? await resposta.json() : [];
    } catch (erro) {
      pecasEstoque = [];
    }
    sel.replaceChildren();
    const vazio = document.createElement('option');
    vazio.value = '';
    vazio.textContent = pecasEstoque.length ? 'Escolha a peça' : 'Nenhuma peça no estoque';
    sel.appendChild(vazio);
    pecasEstoque.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nome} (${p.qtd} ${p.unidade || 'un'})`;
      sel.appendChild(opt);
    });
  }

  function adicionarPeca(pecaId, nome, quantidade, unidade) {
    const existente = pecasUsadas.find(p => p.pecaId === pecaId);
    if (existente) existente.quantidade += quantidade;
    else pecasUsadas.push({ pecaId, nome, quantidade, unidade: unidade || 'un' });
    renderPecasUsadas();
  }

  function adicionarPecaUsada() {
    const pecaId = Number(document.getElementById('pecaUsadaSelect').value);
    const quantidade = Number(document.getElementById('pecaUsadaQtd').value);
    const peca = pecasEstoque.find(p => p.id === pecaId);
    if (!peca) { avisar('Escolha a peça usada.'); return; }
    if (!Number.isInteger(quantidade) || quantidade < 1) { avisar('Informe uma quantidade válida.'); return; }
    adicionarPeca(peca.id, peca.nome, quantidade, peca.unidade);
    document.getElementById('pecaUsadaQtd').value = 1;
  }

  function removerPecaUsada(pecaId) {
    pecasUsadas = pecasUsadas.filter(p => p.pecaId !== pecaId);
    renderPecasUsadas();
  }

  function renderPecasUsadas() {
    const lista = document.getElementById('pecasUsadasLista');
    lista.replaceChildren();
    pecasUsadas.forEach(p => {
      const li = document.createElement('li');
      const texto = document.createElement('span');
      texto.textContent = `${p.quantidade} ${p.unidade} de ${p.nome}`;
      const remover = document.createElement('button');
      remover.type = 'button';
      remover.title = `Remover ${p.nome}`;
      remover.setAttribute('aria-label', `Remover ${p.nome}`);
      remover.innerHTML = '<i class="fas fa-xmark"></i>';
      remover.addEventListener('click', () => removerPecaUsada(p.pecaId));
      li.append(texto, remover);
      lista.appendChild(li);
    });
  }
