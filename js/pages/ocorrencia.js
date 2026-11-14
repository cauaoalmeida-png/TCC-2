  // Número do operador da linha (WhatsApp geral para demo)
  const SUPERVISOR_WPP = '5571981828080';

  let todosSetores = [];
  let todasMaquinas = [];

  document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    document.getElementById('operadorIdentificado').value = getSessao().usuario.nome;
    try { clearNextUrl && clearNextUrl(); } catch (e) {}
    preencherTurnoPelaHora();
    if (isOperario()) iniciarModoRapido();
    carregarFiltros();
    iniciarRelatoIA();
  });

  // ==========================================
  // MODO RÁPIDO DO OPERÁRIO
  // Quem está na máquina só escolhe setor, máquina e toca no problema.
  // ==========================================
  const PROBLEMAS_RAPIDOS = [
    { texto: 'Parou / não liga', icone: 'fa-power-off', tipo: 'Parada de máquina' },
    { texto: 'Travou', icone: 'fa-lock', tipo: 'Parada de máquina' },
    { texto: 'Barulho estranho', icone: 'fa-volume-high', tipo: 'Parada de máquina' },
    { texto: 'Vazamento', icone: 'fa-droplet', tipo: 'Parada de máquina' },
    { texto: 'Superaquecendo', icone: 'fa-temperature-high', tipo: 'Parada de máquina' },
    { texto: 'Peça quebrada', icone: 'fa-gears', tipo: 'Parada de máquina' },
    { texto: 'Falta de material', icone: 'fa-box-open', tipo: 'Falta de material' },
    { texto: 'Peça saindo com defeito', icone: 'fa-triangle-exclamation', tipo: 'Problema de qualidade' }
  ];

  function preencherTurnoPelaHora() {
    const turno = document.getElementById('turnoSelect');
    if (turno.value) return;
    const hora = new Date().getHours();
    turno.value = hora >= 6 && hora < 14 ? 'Manhã' : hora >= 14 && hora < 22 ? 'Tarde' : 'Noite';
  }

  function iniciarModoRapido() {
    const titulo = document.querySelector('.form-header h1');
    if (titulo) titulo.innerHTML = '<i class="fas fa-exclamation-triangle"></i> A máquina parou?';
    document.getElementById('ocorrenciaIntro').textContent =
      'Escolha o setor, a máquina e toque no problema. O operador da linha recebe o alerta na hora.';
    const tipo = document.getElementById('tipoSelect');
    if (!tipo.value) tipo.value = 'Parada de máquina';

    const caixa = document.getElementById('problemasRapidos');
    const grade = caixa.querySelector('.problemas-rapidos');
    PROBLEMAS_RAPIDOS.forEach(p => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'problema-chip';
      botao.setAttribute('aria-pressed', 'false');
      botao.innerHTML = `<i class="fas ${p.icone}" aria-hidden="true"></i>`;
      botao.append(p.texto);
      botao.addEventListener('click', () => {
        grade.querySelectorAll('.problema-chip').forEach(b => b.setAttribute('aria-pressed', String(b === botao)));
        tipo.value = p.tipo;
        problemaEscolhido = p.texto;
      });
      grade.appendChild(botao);
    });
    caixa.hidden = false;

    // Descrever com palavras fica opcional para o operário
    const descricao = document.getElementById('descricaoInput');
    descricao.required = false;
    descricao.placeholder = 'Opcional: algum detalhe a mais?';
    document.getElementById('descricaoLabel').textContent = 'Detalhes (opcional)';
  }

  let problemaEscolhido = '';

  // ==========================================
  // CARREGA SETORES DO BANCO E PREENCHE O SELECT
  // ==========================================
  async function carregarFiltros() {
    try {
      const [resSetores, resMaquinas] = await Promise.all([
        fetch(`${API_BASE_URL}/setores`),
        fetch(`${API_BASE_URL}/maquinas`)
      ]);
      todosSetores = await resSetores.json();
      todasMaquinas = await resMaquinas.json();

      const selSetor = document.getElementById('setorSelect');
      selSetor.innerHTML = '<option value="">Selecione o setor</option>';

      const nomesVistos = new Set();
      todosSetores.forEach(s => {
        if (!nomesVistos.has(s.nome_setor)) {
          nomesVistos.add(s.nome_setor);
          const opt = document.createElement('option');
          opt.value = s.nome_setor;
          opt.textContent = s.nome_setor;
          selSetor.appendChild(opt);
        }
      });

      // Pré-seleciona setor/máquina se vierem pela URL (ex: clicando a partir do Painel de Status)
      const params = new URLSearchParams(window.location.search);
      const setorParam = params.get('setor');
      const maquinaParam = params.get('maquina');
      const tipoParam = params.get('tipo');
      const tipoSelect = document.getElementById('tipoSelect');
      if (tipoParam && [...tipoSelect.options].some(o => o.value === tipoParam)) {
        tipoSelect.value = tipoParam;
      }
      if (setorParam) {
        selSetor.value = setorParam;
        loadMaquinas();
        if (maquinaParam) {
          document.getElementById('maquinaSelect').value = maquinaParam;
        }
      }
    } catch (erro) {
      console.error('Erro ao carregar setores/máquinas do banco de dados:', erro);
    }
  }

  // ==========================================
  // FILTRAR AS MÁQUINAS PELO SETOR ESCOLHIDO
  // ==========================================
  function loadMaquinas() {
    const setor = document.getElementById('setorSelect').value;
    const sel = document.getElementById('maquinaSelect');

    const maquinasFiltradas = todasMaquinas.filter(m => m.setor_associado === setor);

    sel.innerHTML = '<option value="">Selecione a máquina</option>';
    maquinasFiltradas.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.nome_maquina; opt.textContent = m.nome_maquina;
      sel.appendChild(opt);
    });
  }

  document.getElementById('setorSelect').addEventListener('change', loadMaquinas);

  // ==========================================
  // PREVIEW DA FOTO (Visual)
  // ==========================================
  document.getElementById('fotoInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        document.getElementById('fotoPreview').innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    }
  });

  // ==========================================
  // SALVAR NO BANCO DE DADOS
  // ==========================================
  document.getElementById('ocorrenciaForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const setor = document.getElementById('setorSelect').value;
    const maquina = document.getElementById('maquinaSelect').value;
    const tipo = document.getElementById('tipoSelect').value;
    const turno = document.getElementById('turnoSelect').value;
    const operador = getSessao().usuario.nome;
    const detalhes = document.getElementById('descricaoInput').value.trim();
    if (isOperario() && !problemaEscolhido && !detalhes) {
      avisar('Toque no problema ou escreva o que aconteceu.');
      return;
    }
    const descricao = problemaEscolhido
      ? (detalhes ? `${problemaEscolhido}. ${detalhes}` : problemaEscolhido)
      : detalhes;

    const novaOcorrencia = {
      setor, maquina, tipo, turno, descricao,
      data: new Date().toISOString(),
      status: 'Pendente',
      resolucao: '',
      itensChecklist: null
    };

    const btn = this.querySelector('button[type="submit"]');
    const txtOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
    btn.style.pointerEvents = 'none';

    try {
      const resposta = await fetch(`${API_BASE_URL}/cadastrar-ocorrencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaOcorrencia)
      });

      if (resposta.status === 201) {
        const msg = encodeURIComponent(
          ` *Nova Ocorrência - FactoryTrack*\n\n` +
          ` *Setor:* ${setor}\n` +
          ` *Máquina:* ${maquina}\n` +
          ` *Tipo:* ${tipo}\n` +
          ` *Operador:* ${operador} (${turno})\n` +
          ` *Descrição:* ${descricao}\n\n` +
          `Acesse o FactoryTrack para mais detalhes.`
        );

        document.getElementById('wppLink').href = `https://wa.me/${SUPERVISOR_WPP}?text=${msg}`;
        document.getElementById('successMsg').classList.add('show');
        document.getElementById('wppBox').classList.add('show');
        document.getElementById('ocorrenciaForm').style.display = 'none';
      } else {
        avisar('Erro ao salvar ocorrência no banco.');
        btn.innerHTML = txtOriginal;
        btn.style.pointerEvents = 'auto';
      }
    } catch (erro) {
      console.error('Falha ao comunicar com o servidor:', erro);
      avisar('Erro na conexão com o servidor. O back-end está rodando?');
      btn.innerHTML = txtOriginal;
      btn.style.pointerEvents = 'auto';
    }
  });

  // ==========================================
  // RELATO POR IA
  // O operador escreve (ou dita) o problema e a IA preenche o formulário.
  // ==========================================
  let iaFoto = null;

  async function iniciarRelatoIA() {
    if (await iaAtiva()) document.getElementById('iaBox').hidden = false;
  }

  document.getElementById('iaFoto').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    const nome = document.getElementById('iaFotoNome');
    iaFoto = null;
    nome.textContent = 'Foto (opcional)';
    if (!file) return;
    try {
      iaFoto = await iaReduzirFoto(file);
      nome.textContent = 'Foto anexada';
    } catch (erro) {
      iaMostrarErro(document.getElementById('iaErro'), 'Não foi possível ler essa imagem. Tente outra foto.');
    }
  });

  function preencherFormulario(sugestao) {
    if (sugestao.setor) {
      document.getElementById('setorSelect').value = sugestao.setor;
      loadMaquinas();
      if (sugestao.maquina) document.getElementById('maquinaSelect').value = sugestao.maquina;
    }
    if (sugestao.tipo) document.getElementById('tipoSelect').value = sugestao.tipo;
    if (sugestao.turno) document.getElementById('turnoSelect').value = sugestao.turno;
    document.getElementById('descricaoInput').value =
      `${sugestao.descricao}\n\nCausa provável (sugestão da IA): ${sugestao.causaProvavel}\nPrimeiro passo sugerido: ${sugestao.acaoSugerida}`;

    const gravidade = document.getElementById('iaGravidade');
    gravidade.textContent = `Gravidade ${sugestao.gravidade}`;
    gravidade.dataset.nivel = sugestao.gravidade;
    document.getElementById('iaCausa').textContent = sugestao.causaProvavel;
    document.getElementById('iaAcao').textContent = sugestao.acaoSugerida;
    document.getElementById('iaResultado').hidden = false;
  }

  document.getElementById('iaBtn').addEventListener('click', async function() {
    const texto = document.getElementById('iaTexto').value.trim();
    const caixaErro = document.getElementById('iaErro');
    iaMostrarErro(caixaErro, '');
    if (texto.length < 5) {
      iaMostrarErro(caixaErro, 'Escreva um pouco mais sobre o problema.');
      return;
    }

    iaCarregando(this, true);
    const { dados, erro } = await iaChamar('/ia/relato', { texto, foto: iaFoto });
    iaCarregando(this, false);
    if (erro) {
      iaMostrarErro(caixaErro, erro);
      return;
    }
    preencherFormulario(dados);
    document.getElementById('ocorrenciaForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
