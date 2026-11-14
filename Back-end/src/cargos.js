// Cargos do FactoryTrack, seguindo a hierarquia real do chão de fábrica:
//   operario        → está na máquina; só avisa que ela parou e qual o problema
//   operador_linha  → coordena a linha; confirma a parada e designa quem conserta
//   engenheiro      → conserta; registra o que fez e as peças usadas e fecha
//   admin           → gestor do sistema; faz tudo e cuida das contas
//
// Os códigos internos não mudam; o nome que aparece na tela pode ser trocado
// por cada fábrica (tabela "configuracoes", chave "nomes_cargos").

const CARGOS = ['operario', 'operador_linha', 'engenheiro', 'admin'];

const NOMES_PADRAO = {
    operario: 'Operário',
    operador_linha: 'Operador',
    engenheiro: 'Engenheiro de produção',
    admin: 'Administrador'
};

// Quem pode fazer o quê
const GRUPOS = {
    // Estoque, checklist, cadastro de setores/máquinas e assistente de IA
    gestao: ['operador_linha', 'engenheiro', 'admin'],
    // Confirmar a parada, designar o engenheiro, guindastes e excluir registros
    coordenacao: ['operador_linha', 'admin'],
    // Iniciar e concluir o conserto e ver a previsão de falhas
    manutencao: ['engenheiro', 'admin'],
    // Contas e nomes dos cargos
    admin: ['admin']
};

// Converte cargos antigos (e variações) para os novos códigos.
// Antes: operador (chão de fábrica), gerente e chefe_geral.
function normalizeRole(role) {
    const valor = String(role || '').trim().toLowerCase();
    if (CARGOS.includes(valor)) return valor;
    if (['chefe_geral', 'administrador', 'gestor'].includes(valor)) return 'admin';
    if (['gerente', 'supervisor', 'coordenador', 'lider'].includes(valor)) return 'operador_linha';
    if (['engenheiro_producao', 'engenharia', 'manutencao'].includes(valor)) return 'engenheiro';
    return 'operario';
}

// Mesma conversão, já gravada no banco (antigo → novo). Os códigos novos não
// colidem com os antigos, então rodar várias vezes não muda nada.
const MIGRACAO_LEGADO = [
    ['chefe_geral', 'admin'],
    ['gerente', 'operador_linha'],
    ['operador', 'operario']
];

function requireCargos(cargos, mensagem) {
    return function (req, res, next) {
        if (!cargos.includes(req.user?.cargo)) {
            return res.status(403).json({ erro: mensagem || 'Seu cargo não tem permissão para esta ação.' });
        }
        next();
    };
}

const requireGestao = requireCargos(GRUPOS.gestao, 'Acesso permitido somente a operadores, engenheiros e administradores.');
const requireCoordenacao = requireCargos(GRUPOS.coordenacao, 'Somente o operador da linha ou o administrador pode fazer isso.');
const requireManutencao = requireCargos(GRUPOS.manutencao, 'Somente o engenheiro de produção ou o administrador pode fazer isso.');
const requireAdmin = requireCargos(GRUPOS.admin, 'Somente o administrador pode gerenciar contas.');

// Nomes exibidos: padrão + o que a fábrica personalizou
async function lerNomesCargos(prisma) {
    try {
        const linha = await prisma.configuracao.findUnique({ where: { chave: 'nomes_cargos' } });
        const salvos = linha ? JSON.parse(linha.valor) : {};
        const nomes = { ...NOMES_PADRAO };
        for (const cargo of CARGOS) {
            if (typeof salvos[cargo] === 'string' && salvos[cargo].trim()) nomes[cargo] = salvos[cargo].trim();
        }
        return nomes;
    } catch (err) {
        console.error('Erro ao ler nomes dos cargos:', err.message);
        return { ...NOMES_PADRAO };
    }
}

module.exports = {
    CARGOS,
    NOMES_PADRAO,
    GRUPOS,
    MIGRACAO_LEGADO,
    normalizeRole,
    requireCargos,
    requireGestao,
    requireCoordenacao,
    requireManutencao,
    requireAdmin,
    lerNomesCargos
};
