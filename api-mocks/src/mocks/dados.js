// Dados "falsos" (mocks) que imitam o que o banco (Prisma) devolveria.
// Nada aqui é salvo: cada requisição recebe sempre o mesmo JSON estático.

const usuarios = [
    { id: 1, nome: 'Cauã Oliveira', usuario: 'caua@factorytrack.com', cargo: 'chefe_geral', ativo: true },
    { id: 2, nome: 'Ana Souza', usuario: 'ana@factorytrack.com', cargo: 'gerente', ativo: true },
    { id: 3, nome: 'João Lima', usuario: 'joao@factorytrack.com', cargo: 'operador', ativo: true }
];

const setores = [
    { id: 1, nome_setor: 'Usinagem', responsavel: 'Ana Souza', criado_em: '2026-10-01T08:00:00.000Z' },
    { id: 2, nome_setor: 'Montagem', responsavel: 'Carlos Mendes', criado_em: '2026-10-01T08:05:00.000Z' },
    { id: 3, nome_setor: 'Pintura', responsavel: 'Beatriz Rocha', criado_em: '2026-10-02T09:00:00.000Z' }
];

const maquinas = [
    { id: 1, nome_maquina: 'Torno CNC 01', setor_associado: 'Usinagem', numero_serie: 'TCNC-2024-001', criado_em: '2026-10-03T10:00:00.000Z' },
    { id: 2, nome_maquina: 'Prensa Hidráulica', setor_associado: 'Montagem', numero_serie: 'PH-550-17', criado_em: '2026-10-03T10:10:00.000Z' },
    { id: 3, nome_maquina: 'Cabine de Pintura', setor_associado: 'Pintura', numero_serie: null, criado_em: '2026-10-04T11:00:00.000Z' }
];

const ocorrencias = [
    {
        id: 1,
        usuarioId: 3,
        data: '2026-10-27T07:42:00.000Z',
        setor: 'Usinagem',
        maquina: 'Torno CNC 01',
        tipo: 'Parada de máquina',
        operador: 'João Lima',
        turno: 'Manhã',
        descricao: 'Fuso travou durante o ciclo.',
        status: 'Pendente',
        resolucao: '',
        itensChecklist: null,
        dataResolucao: null
    },
    {
        id: 2,
        usuarioId: 2,
        data: '2026-10-26T14:10:00.000Z',
        setor: 'Montagem',
        maquina: 'Prensa Hidráulica',
        tipo: 'Manutenção preventiva',
        operador: 'Ana Souza',
        turno: 'Tarde',
        descricao: 'Troca do óleo hidráulico.',
        status: 'Resolvido',
        resolucao: 'Óleo trocado e filtro substituído.',
        itensChecklist: null,
        dataResolucao: '2026-10-26T16:30:00.000Z'
    }
];

const pecas = [
    { id: 1, nome: 'Rolamento 6205', categoria: 'Mecânica', qtd: 24, min: 10, unidade: 'un' },
    { id: 2, nome: 'Correia em V A-42', categoria: 'Transmissão', qtd: 3, min: 5, unidade: 'un' },
    { id: 3, nome: 'Óleo hidráulico ISO 68', categoria: 'Lubrificação', qtd: 40, min: 20, unidade: 'L' }
];

const guindastes = [
    { id: 1, modelo: 'Liebherr LTM 1050', identificacao: 'GD-01', status: 'Disponível' },
    { id: 2, modelo: 'Grove GMK 3060', identificacao: 'GD-02', status: 'Alugado' }
];

const alugueis = [
    {
        id: 1,
        guindasteId: 2,
        cliente: 'Construtora Horizonte',
        dataLocacao: '2026-10-20T08:00:00.000Z',
        dataPrevistaDevolucao: '2026-11-05T00:00:00.000Z',
        dataDevolucaoReal: null,
        status: 'Ativo',
        guindaste: guindastes[1]
    }
];

module.exports = { usuarios, setores, maquinas, ocorrencias, pecas, guindastes, alugueis };
