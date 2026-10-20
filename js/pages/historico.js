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

    document.getElementById('summaryBar').innerHTML = `
      ${maquinaURL ? `<a class="summary-pill summary-filtro" href="historico.html" title="Mostrar todas as máquinas"><i class="fas fa-filter"></i> ${escapeHTML(maquinaURL)} <i class="fas fa-xmark"></i></a>` : ''}
      <div class="summary-pill"><span class="num pendente">${todas.filter(o=>o.status==='Pendente').length}</span> Pendentes</div>
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
      <div class="hist-card ${isPendente ? 'pendente' : 'resolvido'}">
        <div class="hist-card-header">
          <div>
            <h3><i class="fas ${tipoIcon(o.tipo)}"></i> ${escapeHTML(o.tipo)} — ${escapeHTML(o.maquina)}</h3>
            <p>${escapeHTML(o.setor)}</p>
          </div>
          <div class="hist-badges">
            ${isPendente
              ? '<span class="badge badge-danger"><i class="fas fa-clock"></i> Pendente</span>'
              : '<span class="badge badge-success"><i class="fas fa-check"></i> Resolvido</span>'}
            ${mostrandoTimer ? `<span id="timer-${o.id}" class="hist-timer"><i class="fas fa-hourglass-half"></i> Sumindo em ${formatarTimer(resto)}</span>` : ''}
          </div>
        </div>
        <div class="hist-card-meta">
          <span><i class="fas fa-calendar"></i> ${dataFormatada}</span>
          <span><i class="fas fa-user"></i> ${escapeHTML(o.usuario?.usuario ? `${o.operador} (@${o.usuario.usuario})` : o.operador)}</span>
          <span><i class="fas fa-clock"></i> Turno: ${escapeHTML(o.turno)}</span>
        </div>
        <div class="hist-card-desc">${escapeHTML(o.descricao)}</div>
        ${o.resolucao ? `<div class="hist-card-resolucao"><i class="fas fa-check-circle"></i> <strong>Resolução:</strong> ${escapeHTML(o.resolucao)}</div>` : ''}
        ${isOperator() ? '' : `
        <div class="hist-card-footer">
            ${isPendente ? `
                <button class="btn btn-success btn-sm" onclick="abrirModal(${o.id})">
                    <i class="fas fa-check"></i> Marcar como Resolvido
                </button>
                <a href="checklist.html?setor=${encodeURIComponent(o.setor)}&amp;maquina=${encodeURIComponent(o.maquina)}" class="btn btn-primary btn-sm">
                    <i class="fas fa-plus"></i> Novo Checklist
                </a>
            ` : ''}
            <button onclick="excluirRegistro(${o.id})" class="btn btn-danger btn-sm btn-push-right">
                <i class="fas fa-trash"></i> Excluir
            </button>
        </div>`}
      </div>
    `;
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
        alert("Erro: ID do registro não foi encontrado.");
        return;
    }

    if (confirm(`Tem certeza que deseja excluir a ocorrência #${id}?`)) {
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
                alert("Ocorrência excluída com sucesso!");
                renderHistorico(); // Recarrega a tela do histórico
            } else {
                const erroDados = await resposta.json().catch(() => ({}));
                alert(`Erro (${resposta.status}): ${erroDados.erro || 'Servidor recusou a exclusão.'}`);
            }
        } catch (erro) {
            console.error("Erro de conexão:", erro);
            alert("Erro de conexão! Verifique se o servidor Node.js está rodando.");
        }
    }
}

  function abrirModal(id) {
    resolvendoId = id;
    document.getElementById('resolucaoInput').value = '';
    document.getElementById('modalOverlay').classList.add('open');
  }

  function fecharModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    resolvendoId = null;
  }

  // ATUALIZAR STATUS NO BANCO
  async function confirmarResolucao() {
    const texto = document.getElementById('resolucaoInput').value.trim();
    if (!texto) { alert('Por favor, descreva o que foi feito.'); return; }
    
    const dataAtual = new Date().toISOString();

    try {
        const resposta = await fetch(`${API_BASE_URL}/resolver-ocorrencia/${resolvendoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resolucao: texto, dataResolucao: dataAtual })
        });
        if (!resposta.ok) {
            const erro = await resposta.json().catch(() => ({}));
            alert(erro.erro || 'Não foi possível marcar como resolvido.');
            return;
        }
        fecharModal();
        renderHistorico(); // Recarrega da base de dados
    } catch (erro) {
        alert('Erro ao comunicar com o servidor.');
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

  if (!expOc && !expEst && !expCad) { alert('Selecione pelo menos uma opção.'); return; }

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
      alert("Erro ao buscar dados do servidor para a exportação!");
      btn.innerHTML = '<i class="fas fa-download"></i> Exportar';
      btn.style.pointerEvents = 'auto';
  }
}
