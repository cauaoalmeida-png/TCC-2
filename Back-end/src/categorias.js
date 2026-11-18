// Categorias e unidades das peças do estoque. Lista única usada pelo cadastro,
// pela leitura de nota fiscal (IA) e pela arrumação dos dados antigos.
// A tela do Estoque (js/pages/estoque.js) usa a mesma lista.

const CATEGORIAS_PECA = ['Fixação', 'Elétrico', 'Mecânico', 'Hidráulico', 'Pneumático', 'Lubrificação', 'Insumo', 'Outro'];
const UNIDADES_PECA = ['un', 'kg', 'm', 'L', 'cx'];

function semAcento(texto) {
    return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// Nomes antigos ou escritos de outro jeito que têm uma categoria certa.
const APELIDOS_CATEGORIA = {
    'peca de maquina': 'Mecânico',
    'mecanica': 'Mecânico',
    'eletrica': 'Elétrico',
    'eletronico': 'Elétrico',
    'hidraulica': 'Hidráulico',
    'pneumatica': 'Pneumático',
    'lubrificante': 'Lubrificação',
    'oleo': 'Lubrificação',
    'consumivel': 'Insumo',
    'insumos': 'Insumo'
};

// Devolve a categoria da lista; o que não se encaixa vira "Outro".
function normalizarCategoria(valor) {
    const chave = semAcento(valor);
    if (!chave) return 'Outro';
    const exata = CATEGORIAS_PECA.find(c => semAcento(c) === chave);
    return exata || APELIDOS_CATEGORIA[chave] || 'Outro';
}

// Padroniza a unidade quando ela é uma das conhecidas (ex.: "l" vira "L").
// Outras unidades (vindas de nota fiscal, como "pc" ou "rl") ficam como estão.
function normalizarUnidade(valor) {
    const texto = String(valor ?? '').trim();
    if (!texto) return 'un';
    const chave = semAcento(texto);
    const apelidos = { unidade: 'un', und: 'un', unid: 'un', litro: 'L', litros: 'L', lt: 'L', metro: 'm', metros: 'm', caixa: 'cx', quilo: 'kg' };
    return UNIDADES_PECA.find(u => u.toLowerCase() === chave) || apelidos[chave] || texto.slice(0, 20);
}

module.exports = { CATEGORIAS_PECA, UNIDADES_PECA, normalizarCategoria, normalizarUnidade, semAcento };
