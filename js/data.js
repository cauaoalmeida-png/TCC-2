/* ============================================
   DATA.JS - Dados iniciais do FactoryTrack
   Popula o localStorage com dados fictícios
   ============================================ */

const dadosIniciais = {
  setores: [
    { id: 1, nome: 'Montagem', responsavel: 'Carlos Silva' },
    { id: 2, nome: 'Qualidade', responsavel: 'Ana Paula' },
    { id: 3, nome: 'Expedição', responsavel: 'Roberto Melo' },
    { id: 4, nome: 'Manutenção', responsavel: 'José Ferreira' }
  ],
  maquinas: [
    { id: 1, nome: 'Esteira Linha A', setor: 'Montagem', serie: 'EST-001' },
    { id: 2, nome: 'Parafusadeira Automática', setor: 'Montagem', serie: 'PAF-002' },
    { id: 3, nome: 'Mesa de Inspeção Visual', setor: 'Qualidade', serie: 'INS-003' },
    { id: 4, nome: 'Calibrador Digital', setor: 'Qualidade', serie: 'CAL-004' },
    { id: 5, nome: 'Empilhadeira Elétrica', setor: 'Expedição', serie: 'EMP-005' },
    { id: 6, nome: 'Balança Industrial', setor: 'Expedição', serie: 'BAL-006' },
    { id: 7, nome: 'Compressor de Ar', setor: 'Manutenção', serie: 'CMP-007' }
  ],
  ocorrencias: [
    {
      id: 1,
      setor: 'Montagem',
      maquina: 'Esteira Linha A',
      tipo: 'Parada de máquina',
      descricao: 'Esteira parou após travamento na correia. Produção interrompida.',
      operador: 'Lucas Andrade',
      turno: 'Manhã',
      data: '2025-05-01T08:30:00',
      status: 'Resolvido',
      resolucao: 'Correia reposicionada e tensionada. Retornou ao normal em 40 minutos.'
    },
    {
      id: 2,
      setor: 'Qualidade',
      maquina: 'Calibrador Digital',
      tipo: 'Problema de qualidade',
      descricao: 'Calibrador apresentando leituras inconsistentes. Lote reprovado.',
      operador: 'Fernanda Costa',
      turno: 'Tarde',
      data: '2025-05-02T14:10:00',
      status: 'Pendente',
      resolucao: ''
    },
    {
      id: 3,
      setor: 'Expedição',
      maquina: 'Empilhadeira Elétrica',
      tipo: 'Manutenção preventiva',
      descricao: 'Manutenção preventiva agendada. Bateria com 20% de carga residual.',
      operador: 'Marcos Oliveira',
      turno: 'Noite',
      data: '2025-05-03T22:00:00',
      status: 'Resolvido',
      resolucao: 'Bateria carregada e revisão elétrica concluída.'
    },
    {
      id: 4,
      setor: 'Montagem',
      maquina: 'Parafusadeira Automática',
      tipo: 'Falta de material',
      descricao: 'Estoque de parafusos M6 zerado. Linha parada aguardando reposição.',
      operador: 'João Pedro',
      turno: 'Manhã',
      data: '2025-05-04T09:45:00',
      status: 'Pendente',
      resolucao: ''
    },
    {
      id: 5,
      setor: 'Manutenção',
      maquina: 'Compressor de Ar',
      tipo: 'Parada de máquina',
      descricao: 'Compressor desligou por superaquecimento. Temperatura acima do limite.',
      operador: 'André Santos',
      turno: 'Tarde',
      data: '2025-05-05T13:20:00',
      status: 'Pendente',
      resolucao: ''
    }
  ]
};

function initData() {
  if (!localStorage.getItem('ft_initialized')) {
    localStorage.setItem('ft_setores', JSON.stringify(dadosIniciais.setores));
    localStorage.setItem('ft_maquinas', JSON.stringify(dadosIniciais.maquinas));
    localStorage.setItem('ft_ocorrencias', JSON.stringify(dadosIniciais.ocorrencias));
    localStorage.setItem('ft_initialized', 'true');
    console.log('FactoryTrack: dados iniciais carregados.');
  }
}

function getSetores() { return JSON.parse(localStorage.getItem('ft_setores') || '[]'); }
function getMaquinas() { return JSON.parse(localStorage.getItem('ft_maquinas') || '[]'); }
function getOcorrencias() { return JSON.parse(localStorage.getItem('ft_ocorrencias') || '[]'); }

function saveOcorrencias(list) { localStorage.setItem('ft_ocorrencias', JSON.stringify(list)); }
function saveSetores(list) { localStorage.setItem('ft_setores', JSON.stringify(list)); }
function saveMaquinas(list) { localStorage.setItem('ft_maquinas', JSON.stringify(list)); }

function nextId(list) { return list.length ? Math.max(...list.map(i => i.id)) + 1 : 1; }

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

initData();

//  ADICIONADO [Motivo: Remove uma ocorrência do histórico pelo ID]
function deleteOcorrencia(id) {
    let ocorrencias = getOcorrencias();
    // Filtra mantendo apenas as ocorrências com ID diferente do selecionado
    ocorrencias = ocorrencias.filter(o => Number(o.id) !== Number(id));
    saveOcorrencias(ocorrencias);
}
