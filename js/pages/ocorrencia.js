  // Número do supervisor (WhatsApp geral para demo)
  const SUPERVISOR_WPP = '5571981828080';

  let todosSetores = [];
  let todasMaquinas = [];

  document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    document.getElementById('operadorIdentificado').value = getSessao().usuario.nome;
    try { clearNextUrl && clearNextUrl(); } catch (e) {}
    carregarFiltros();
  });

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
    const descricao = document.getElementById('descricaoInput').value;

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
        alert('Erro ao salvar ocorrência no banco.');
        btn.innerHTML = txtOriginal;
        btn.style.pointerEvents = 'auto';
      }
    } catch (erro) {
      console.error('Falha ao comunicar com o servidor:', erro);
      alert('Erro na conexão com o servidor. O back-end está rodando?');
      btn.innerHTML = txtOriginal;
      btn.style.pointerEvents = 'auto';
    }
  });
