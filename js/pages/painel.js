  let setoresCache = [];
  let maquinasCache = [];
  let ocorrenciasCache = [];

  document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    try { clearNextUrl && clearNextUrl(); } catch (e) {}
    renderPainel();
    iniciarAssistenteIA();
  });

  // Recarrega quando o usuário volta para esta aba (ex: vindo de outra tela do sistema)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') renderPainel();
  });

  async function carregarDadosPainel() {
    const [resSetores, resMaquinas, resOcorrencias] = await Promise.all([
      fetch(`${API_BASE_URL}/setores`),
      fetch(`${API_BASE_URL}/maquinas`),
      fetch(`${API_BASE_URL}/ocorrencias`)
    ]);
    setoresCache = await resSetores.json();
    maquinasCache = await resMaquinas.json();
    ocorrenciasCache = await resOcorrencias.json();
  }

  function escapeHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  // Clicar num resumo filtra por aquele status; clicar de novo mostra todos
  function filtrarStatus(status) {
    const sel = document.getElementById('filterStatus');
    sel.value = sel.value === status ? '' : status;
    renderPainel();
  }

  function renderResumoStatus(maquinas, statusAtivo) {
    const opcoes = [['Funcionando', 'green'], ['Atenção', 'yellow'], ['Parado', 'red']];
    document.getElementById('statusSummary').innerHTML = opcoes.map(([status, cor]) => {
      const total = maquinas.filter(m => getStatusMaquina(m).status === status).length;
      const ativo = statusAtivo === status;
      return `<button type="button" class="status-chip ${cor}${ativo ? ' active' : ''}" aria-pressed="${ativo}" onclick="filtrarStatus('${status}')">
        <span class="status-dot ${cor}"></span><strong>${total}</strong> ${status}
      </button>`;
    }).join('');
  }

  function getStatusMaquina(maquina) {
    const pendentes = ocorrenciasCache.filter(o => o.maquina === maquina.nome_maquina && o.status === 'Pendente');
    if (pendentes.length === 0) return { status: 'Funcionando', cor: 'green', icone: 'fa-check-circle' };
    const tipos = pendentes.map(o => o.tipo);
    if (tipos.includes('Parada de máquina')) return { status: 'Parado', cor: 'red', icone: 'fa-times-circle' };
    return { status: 'Atenção', cor: 'yellow', icone: 'fa-exclamation-circle' };
  }

  function getUltimaOcorrencia(maquina) {
    const todas = ocorrenciasCache.filter(o => o.maquina === maquina.nome_maquina);
    if (!todas.length) return null;
    return todas.slice().sort((a, b) => new Date(b.data) - new Date(a.data))[0];
  }

  async function renderPainel() {
    try {
      await carregarDadosPainel();
    } catch (erro) {
      console.error('Erro ao carregar dados do painel:', erro);
      document.getElementById('painelGrid').innerHTML =
        `<div class="empty-state"><i class="fas fa-plug-circle-xmark"></i><p>Não foi possível conectar ao servidor.</p></div>`;
      return;
    }

    const filterSetor = document.getElementById('filterSetor').value;
    const filterStatus = document.getElementById('filterStatus').value;

    // Atualiza o filtro de Setores dinamicamente
    const sel = document.getElementById('filterSetor');
    const valorAtual = sel.value;
    sel.innerHTML = '<option value="">Todos os Setores</option>';
    setoresCache.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.nome_setor;
      opt.textContent = s.nome_setor;
      sel.appendChild(opt);
    });
    sel.value = valorAtual;

    const grid = document.getElementById('painelGrid');
    let html = '';

    const setoresFiltrados = filterSetor ? setoresCache.filter(s => s.nome_setor === filterSetor) : setoresCache;
    const maquinasDoFiltro = filterSetor ? maquinasCache.filter(m => m.setor_associado === filterSetor) : maquinasCache;
    renderResumoStatus(maquinasDoFiltro, filterStatus);

    setoresFiltrados.forEach(setor => {
      let maquinasSetor = maquinasCache.filter(m => m.setor_associado === setor.nome_setor);

      if (filterStatus) {
        maquinasSetor = maquinasSetor.filter(m => getStatusMaquina(m).status === filterStatus);
      }

      if (!maquinasSetor.length) return;

      html += `<div class="setor-title"><h2><i class="fas fa-cogs"></i> ${escapeHTML(setor.nome_setor)} <span class="setor-resp">Resp: ${escapeHTML(setor.responsavel)}</span></h2></div>`;

      maquinasSetor.forEach(maq => {
        const st = getStatusMaquina(maq);
        const ultima = getUltimaOcorrencia(maq);
        html += `
        <div class="painel-card">
            <div class="painel-card-top">
                <div>
                    <h3>${escapeHTML(maq.nome_maquina)}</h3>
                    <p>Série: ${escapeHTML(maq.numero_serie || 'N/A')} | Setor: ${escapeHTML(maq.setor_associado)}</p>
                    ${ultima ? `<p class="last-update">Última ocorrência: ${formatDate(ultima.data)}</p>` : `<p class="last-update">Sem ocorrências registradas</p>`}
                </div>
                <i class="fas ${st.icone} status-icon ${st.cor}" aria-hidden="true"></i>
            </div>
            <div class="painel-card-status ${st.cor}">
                <span class="status-dot ${st.cor}"></span>
                ${st.status}
            </div>
            <div class="painel-card-footer">
                <a href="ocorrencia.html?setor=${encodeURIComponent(maq.setor_associado)}&maquina=${encodeURIComponent(maq.nome_maquina)}" class="btn btn-primary btn-sm">
                    <i class="fas fa-plus"></i> Registrar Ocorrência
                </a>
                <a href="historico.html?maquina=${encodeURIComponent(maq.nome_maquina)}" class="btn btn-light btn-sm">
                    <i class="fas fa-history"></i> Histórico
                </a>
            </div>
        </div>
        `;
      });
    });

    if (!html) {
      html = `<div class="empty-state"><i class="fas fa-search"></i><p>Nenhum resultado para os filtros selecionados.</p></div>`;
    }

    grid.innerHTML = html;
  }

  // ==========================================
  // ASSISTENTE DA CHEFIA (IA)
  // Perguntas livres sobre os dados e resumo da semana.
  // ==========================================
  async function iniciarAssistenteIA() {
    if (isOperator() || !(await iaAtiva())) return;
    document.getElementById('iaPainel').hidden = false;
  }

  async function perguntarIA(pergunta) {
    const botao = document.getElementById('iaPerguntarBtn');
    const caixaErro = document.getElementById('iaErro');
    const resposta = document.getElementById('iaResposta');
    iaMostrarErro(caixaErro, '');
    if (pergunta.length < 3) {
      iaMostrarErro(caixaErro, 'Escreva a sua pergunta.');
      return;
    }
    iaCarregando(botao, true, 'Pensando...');
    const { dados, erro } = await iaChamar('/ia/pergunta', { pergunta });
    iaCarregando(botao, false);
    if (erro) {
      iaMostrarErro(caixaErro, erro);
      return;
    }
    const titulo = document.createElement('h4');
    titulo.textContent = pergunta;
    const corpo = document.createElement('div');
    iaRenderTexto(corpo, dados.resposta);
    resposta.replaceChildren(titulo, corpo);
    resposta.hidden = false;
  }

  document.getElementById('iaPerguntarBtn').addEventListener('click', () => {
    perguntarIA(document.getElementById('iaPergunta').value.trim());
  });
  document.getElementById('iaPergunta').addEventListener('keydown', e => {
    if (e.key === 'Enter') perguntarIA(e.target.value.trim());
  });
  document.querySelectorAll('.ia-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('iaPergunta').value = chip.dataset.pergunta;
      perguntarIA(chip.dataset.pergunta);
    });
  });

  document.getElementById('iaResumoBtn').addEventListener('click', async function() {
    const caixaErro = document.getElementById('iaErro');
    const resposta = document.getElementById('iaResposta');
    iaMostrarErro(caixaErro, '');
    iaCarregando(this, true, 'Montando resumo...');
    const { dados, erro } = await iaChamar('/ia/resumo', {});
    iaCarregando(this, false);
    if (erro) {
      iaMostrarErro(caixaErro, erro);
      return;
    }
    resposta.replaceChildren();
    const titulo = document.createElement('h4');
    titulo.textContent = 'Resumo da semana';
    const visao = document.createElement('p');
    visao.textContent = dados.visaoGeral;
    resposta.append(titulo, visao);
    iaRenderLista(resposta, 'Destaques', dados.destaques);
    iaRenderLista(resposta, 'Falhas repetidas (últimos 30 dias)',
      (dados.falhasRepetidas || []).map(f => `${f.maquina}: ${f.problema} (${f.vezes} vezes). ${f.recomendacao}`));
    iaRenderLista(resposta, 'Estoque', dados.estoque);
    iaRenderLista(resposta, 'Recomendações para a próxima semana', dados.recomendacoes);
    resposta.hidden = false;
  });
