  document.addEventListener('DOMContentLoaded', () => {
    const ok = requireSupervisor();
    if (!ok) {
      document.body.innerHTML = '';
      goBackOrLogin();
      return;
    }
    try { clearNextUrl && clearNextUrl(); } catch (e) {}
    document.getElementById('inspetorNome').value = getSessao().usuario.nome;
    renderChecklist();
    loadSetores(); // Agora carrega direto do MySQL!
    iaAtiva().then(ativa => { document.getElementById('iaChecklistBox').hidden = !ativa; });
});

const CHECKLIST_ITENS = [
  {
    categoria: 'Estrutura e Pintura', icone: 'fa-paint-roller',
    itens: [
      { id: 'c01', label: 'Riscos ou arranhões na pintura', grav: 'baixa', desc: 'Danos superficiais que não afetam o funcionamento' },
      { id: 'c02', label: 'Corrosão superficial (ferrugem leve)', grav: 'media', desc: 'Pode evoluir e afetar estrutura se não tratada' },
      { id: 'c03', label: 'Deformação na estrutura metálica', grav: 'alta', desc: 'Compromete integridade e pode causar falha estrutural' },
      { id: 'c04', label: 'Rachaduras ou fissuras no chassi', grav: 'critica', desc: 'Parar a máquina imediatamente para inspeção' },
    ]
  },
  {
    categoria: 'Sistema Elétrico', icone: 'fa-bolt',
    itens: [
      { id: 'c05', label: 'Lâmpadas indicadoras queimadas', grav: 'baixa', desc: 'Não afeta operação, apenas sinalização visual' },
      { id: 'c06', label: 'Cabo com isolamento desgastado', grav: 'alta', desc: 'Risco de curto-circuito e choque elétrico' },
      { id: 'c07', label: 'Disjuntor disparando com frequência', grav: 'alta', desc: 'Indica sobrecarga ou problema no circuito' },
      { id: 'c08', label: 'Faísca ou cheiro de queimado', grav: 'critica', desc: 'Parar imediatamente — risco de incêndio' },
    ]
  },
  {
    categoria: 'Sistema Mecânico', icone: 'fa-cogs',
    itens: [
      { id: 'c09', label: 'Ruído incomum durante operação', grav: 'media', desc: 'Pode indicar desgaste em rolamentos ou engrenagens' },
      { id: 'c10', label: 'Vibração excessiva', grav: 'media', desc: 'Verificar fixação e balanceamento' },
      { id: 'c11', label: 'Folga excessiva em componentes móveis', grav: 'alta', desc: 'Compromete precisão e pode causar falha' },
      { id: 'c12', label: 'Trava de segurança danificada ou ausente', grav: 'critica', desc: 'Risco imediato ao operador — parar a máquina' },
    ]
  },
  {
    categoria: 'Sinalização e Segurança', icone: 'fa-shield-alt',
    itens: [
      { id: 'c13', label: 'Etiquetas de identificação apagadas', grav: 'baixa', desc: 'Requer reimpressão e recolocação' },
      { id: 'c14', label: 'Botão de emergência com funcionamento lento', grav: 'alta', desc: 'Deve responder imediatamente quando acionado' },
      { id: 'c15', label: 'Buzina ou alarme com defeito', grav: 'alta', desc: 'Compromete alertas de segurança para operadores' },
      { id: 'c16', label: 'Proteção ou grade de segurança removida', grav: 'critica', desc: 'Risco imediato de acidente — não operar' },
    ]
  },
  {
    categoria: 'Lubrificação e Fluidos', icone: 'fa-oil-can',
    itens: [
      { id: 'c17', label: 'Nível de óleo abaixo do recomendado', grav: 'media', desc: 'Repor antes do próximo turno' },
      { id: 'c18', label: 'Vazamento de óleo ou graxa', grav: 'media', desc: 'Risco de contaminação e escorregamento no piso' },
      { id: 'c19', label: 'Vazamento de fluido hidráulico', grav: 'alta', desc: 'Pode causar falha abrupta no sistema hidráulico' },
      { id: 'c20', label: 'Vazamento de fluido refrigerante', grav: 'alta', desc: 'Risco de superaquecimento da máquina' },
    ]
  }
];

const SUPERVISOR_WPP = '5571981828080'; // DDI+DDD+número, sem espaços/traços (formato exigido pelo link wa.me)

function renderChecklist() {
  const container = document.getElementById('checklistContainer');
  container.innerHTML = CHECKLIST_ITENS.map((cat, ci) => `
    <div class="checklist-card">
      <div class="checklist-card-header" onclick="toggleCategoria(${ci})">
        <h3><i class="fas ${cat.icone}"></i> ${cat.categoria}</h3>
        <i class="fas fa-chevron-down toggle-icon" id="icon-${ci}"></i>
      </div>
      <div class="checklist-items open" id="cat-${ci}">
        ${cat.itens.map(item => `
          <div class="check-item grav-${item.grav}" id="wrap-${item.id}">
            <input type="checkbox" id="${item.id}" onchange="updateSummary(); toggleObs('${item.id}')">
            <div class="check-item-info">
              <label for="${item.id}">
                ${item.label}
                <span class="badge-grav badge-${item.grav}">
                  ${item.grav.toUpperCase()}
                </span>
              </label>
              <small>${item.desc}</small>
              <textarea class="check-item-obs" id="obs-${item.id}" placeholder="Observação sobre este item..."></textarea>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function toggleCategoria(ci) {
  const items = document.getElementById(`cat-${ci}`);
  const icon = document.getElementById(`icon-${ci}`);
  const header = items.previousElementSibling;
  items.classList.toggle('open');
  header.classList.toggle('open');
}

function toggleObs(id) {
  const cb = document.getElementById(id);
  const obs = document.getElementById(`obs-${id}`);
  obs.classList.toggle('show', cb.checked);
}

function updateSummary() {
  let total = 0, baixa = 0, media = 0, alta = 0, critica = 0;
  CHECKLIST_ITENS.forEach(cat => {
    cat.itens.forEach(item => {
      if (document.getElementById(item.id)?.checked) {
        total++;
        if (item.grav === 'baixa') baixa++;
        else if (item.grav === 'media') media++;
        else if (item.grav === 'alta') alta++;
        else if (item.grav === 'critica') critica++;
      }
    });
  });
  document.getElementById('sumTotal').textContent = total;
  document.getElementById('sumBaixa').textContent = baixa;
  document.getElementById('sumMedia').textContent = media;
  document.getElementById('sumAlta').textContent = alta;
  document.getElementById('sumCritica').textContent = critica;
}

// BUSCAR SETORES E MÁQUINAS DO BANCO DE DADOS
async function loadSetores() {
  try {
      const resSetores = await fetch(`${API_BASE_URL}/setores`);
      const setores = await resSetores.json();
      
      const resMaquinas = await fetch(`${API_BASE_URL}/maquinas`);
      const maquinas = await resMaquinas.json();

      const sel = document.getElementById('setorSelect');
      setores.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.nome_setor; opt.textContent = s.nome_setor;
        sel.appendChild(opt);
      });

      sel.onchange = () => {
        const msel = document.getElementById('maquinaSelect');
        const maquinasFiltradas = maquinas.filter(m => m.setor_associado === sel.value);
        msel.innerHTML = '<option value="">Selecione a máquina</option>';
        maquinasFiltradas.forEach(m => {
          const o = document.createElement('option');
          o.value = m.nome_maquina; o.textContent = m.nome_maquina;
          msel.appendChild(o);
        });
      };
  } catch (erro) {
      console.error("Erro ao carregar dados do banco:", erro);
  }
}

// ENVIAR O CHECKLIST PARA O BANCO DE DADOS
async function enviarChecklist() {
  const inspetor = getSessao().usuario.nome;
  const setor = document.getElementById('setorSelect').value;
  const maquina = document.getElementById('maquinaSelect').value;
  const turno = document.getElementById('turnoSelect').value;

  if (!setor || !maquina || !turno) {
    avisar('Preencha setor, máquina e turno antes de registrar.'); return;
  }

  const itensMarcados = [];
  CHECKLIST_ITENS.forEach(cat => {
    cat.itens.forEach(item => {
      const cb = document.getElementById(item.id);
      if (cb?.checked) {
        itensMarcados.push({
          categoria: cat.categoria,
          item: item.label,
          gravidade: item.grav,
          obs: document.getElementById(`obs-${item.id}`)?.value || ''
        });
      }
    });
  });

  const criticos = itensMarcados.filter(i => i.gravidade === 'critica' || i.gravidade === 'alta');

  const registro = {
    setor, maquina,
    tipo: 'Checklist de Manutenção',
    turno,
    descricao: `Checklist com ${itensMarcados.length} item(s) marcado(s). Críticos: ${criticos.length}`,
    itensChecklist: itensMarcados,
    data: new Date().toISOString(),
    status: criticos.length > 0 ? 'Pendente' : 'Resolvido',
    resolucao: criticos.length === 0 ? 'Checklist sem itens críticos.' : ''
  };

  try {
      const resposta = await fetch(`${API_BASE_URL}/cadastrar-ocorrencia`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registro)
      });

      if (resposta.status === 201) {
          document.getElementById('successMsg').classList.add('show');

          if (criticos.length > 0) {
            const linhas = criticos.map(i => `• ${i.item} [${i.gravidade.toUpperCase()}]`).join('\n');
            const msg = encodeURIComponent(
              `⚠️ *CHECKLIST - FactoryTrack*\n\n` +
              `📍 Setor: ${setor} | Máquina: ${maquina}\n` +
              `👷 Inspetor: ${inspetor} (${turno})\n\n` +
              `🔴 *Itens críticos detectados:*\n${linhas}\n\n` +
              `Acesse o FactoryTrack para mais detalhes.`
            );
            document.getElementById('wppLink').href = `https://wa.me/${SUPERVISOR_WPP}?text=${msg}`;
            document.getElementById('wppBox').classList.add('show');
          }

          window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
          avisar("Erro ao salvar checklist no servidor.");
      }
  } catch (erro) {
      avisar("Erro de conexão com o banco de dados.");
  }
}

async function limparChecklist() {
  if (!(await confirmar('Limpar todos os itens marcados?', { titulo: 'Limpar checklist', ok: 'Limpar' }))) return;
  CHECKLIST_ITENS.forEach(cat => {
    cat.itens.forEach(item => {
      const cb = document.getElementById(item.id);
      if (cb) cb.checked = false;
      const obs = document.getElementById(`obs-${item.id}`);
      if (obs) { obs.value = ''; obs.classList.remove('show'); }
    });
  });
  updateSummary();
}

// ==========================================
// ANÁLISE POR FOTO (IA)
// A IA marca os itens que parecem com problema; o inspetor confere.
// ==========================================
document.getElementById('iaChecklistFoto').addEventListener('change', e => {
  const file = e.target.files[0];
  document.getElementById('iaChecklistFotoNome').textContent = file ? 'Foto escolhida' : 'Escolher foto';
});

document.getElementById('iaChecklistBtn').addEventListener('click', async function() {
  const file = document.getElementById('iaChecklistFoto').files[0];
  const caixaErro = document.getElementById('iaChecklistErro');
  const resultado = document.getElementById('iaChecklistResultado');
  iaMostrarErro(caixaErro, '');
  resultado.hidden = true;
  if (!file) {
    iaMostrarErro(caixaErro, 'Escolha uma foto do equipamento.');
    return;
  }

  let foto;
  try {
    foto = await iaReduzirFoto(file, 1600);
  } catch (erro) {
    iaMostrarErro(caixaErro, 'Não foi possível ler essa imagem. Tente outra foto.');
    return;
  }

  const itens = CHECKLIST_ITENS.flatMap(cat => cat.itens.map(item => ({ id: item.id, label: `${cat.categoria}: ${item.label}` })));
  const maquina = document.getElementById('maquinaSelect').value;

  iaCarregando(this, true);
  const { dados, erro } = await iaChamar('/ia/checklist-foto', { foto, itens, maquina });
  iaCarregando(this, false);
  if (erro) {
    iaMostrarErro(caixaErro, erro);
    return;
  }

  const marcados = [];
  dados.itens.forEach(sugestao => {
    const cb = document.getElementById(sugestao.id);
    const obs = document.getElementById(`obs-${sugestao.id}`);
    if (!cb || !obs) return;
    cb.checked = true;
    obs.classList.add('show');
    obs.value = obs.value ? `${obs.value}\nIA: ${sugestao.motivo}` : `IA: ${sugestao.motivo}`;
    const item = CHECKLIST_ITENS.flatMap(c => c.itens).find(i => i.id === sugestao.id);
    marcados.push(`${item.label}: ${sugestao.motivo}`);
  });
  updateSummary();

  resultado.replaceChildren();
  const geral = document.createElement('p');
  geral.textContent = dados.observacaoGeral;
  resultado.appendChild(geral);
  if (marcados.length) {
    iaRenderLista(resultado, `${marcados.length} item(ns) marcado(s) pela IA — confira abaixo:`, marcados);
  } else {
    const nada = document.createElement('p');
    nada.textContent = 'A IA não viu problemas na foto. Confira os itens pessoalmente.';
    resultado.appendChild(nada);
  }
  resultado.hidden = false;
});
