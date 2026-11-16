const AUTH_SESSION_KEY = 'ft_sessao';

try {
  localStorage.removeItem('ft_usuarios');
} catch (erro) {
  console.error('Não foi possível limpar as credenciais antigas do navegador:', erro);
}

function getSessao() {
  try {
    const sessao = JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY));
    if (sessao?.token && sessao?.usuario?.id) return sessao;
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  } catch (erro) {
    console.error('Não foi possível ler a sessão:', erro);
  }
  return null;
}

function saveSessao(sessao) {
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessao));
}

function clearSessao() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}

async function loginUsuario(usuario, senha) {
  try {
    const resposta = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha })
    });
    const resultado = await resposta.json();
    if (!resposta.ok) return { ok: false, msg: resultado.erro || 'Não foi possível entrar.' };
    saveSessao({ token: resultado.token, usuario: resultado.usuario, nomesCargos: resultado.nomesCargos || null });
    return { ok: true, user: resultado.usuario };
  } catch (erro) {
    console.error('Erro ao conectar para autenticação:', erro);
    return { ok: false, msg: 'Não foi possível conectar ao servidor.' };
  }
}

/* Cargos (iguais aos do servidor, em Back-end/src/cargos.js)
   operario        → está na máquina e avisa quando ela para
   operador_linha  → coordena a linha, confirma a parada e designa o engenheiro
   engenheiro      → conserta, registra peças usadas e fecha a ocorrência
   admin           → administrador do sistema (tudo + contas) */
const CARGOS = ['operario', 'operador_linha', 'engenheiro', 'admin'];
const NOMES_CARGOS_PADRAO = {
  operario: 'Operário',
  operador_linha: 'Operador',
  engenheiro: 'Engenheiro de produção',
  admin: 'Administrador'
};
const GRUPOS_CARGOS = {
  gestao: ['operador_linha', 'engenheiro', 'admin'],
  coordenacao: ['operador_linha', 'admin'],
  manutencao: ['engenheiro', 'admin'],
  admin: ['admin']
};

// Converte cargos antigos guardados no navegador (sessões abertas antes da troca)
function normalizarCargo(cargo) {
  if (CARGOS.includes(cargo)) return cargo;
  return { chefe_geral: 'admin', gerente: 'operador_linha', operador: 'operario' }[cargo] || 'operario';
}

function cargoAtual() {
  const sessao = getSessao();
  return sessao ? normalizarCargo(sessao.usuario.cargo) : null;
}

// Ex.: temCargo('coordenacao') ou temCargo(['engenheiro'])
function temCargo(grupoOuLista) {
  const lista = Array.isArray(grupoOuLista) ? grupoOuLista : (GRUPOS_CARGOS[grupoOuLista] || []);
  return lista.includes(cargoAtual());
}

// Nome do cargo na tela; cada fábrica pode personalizar em Cadastros
function cargoLabel(cargo) {
  const codigo = normalizarCargo(cargo);
  const nomes = getSessao()?.nomesCargos || {};
  return nomes[codigo] || NOMES_CARGOS_PADRAO[codigo] || cargo;
}

function cargoBadgeStyle(cargo) {
  const map = {
    admin: 'background:#fce7f3;color:#9d174d',
    engenheiro: 'background:#ede9fe;color:#6d28d9',
    operador_linha: 'background:#dbeafe;color:#1d4ed8',
    operario: 'background:#dcfce7;color:#16a34a'
  };
  return map[normalizarCargo(cargo)] || '';
}

const fetchFactoryTrack = window.fetch.bind(window);
window.fetch = function(input, init = {}) {
  const url = input instanceof Request ? input.url : String(input);
  const sessao = getSessao();
  if (!sessao?.token || !url.startsWith(API_BASE_URL)) {
    return fetchFactoryTrack(input, init);
  }

  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  headers.set('Authorization', 'Bearer ' + sessao.token);
  return fetchFactoryTrack(input, { ...init, headers }).then(resposta => {
    if (resposta.status === 401 && !url.endsWith('/login')) {
      clearSessao();
      window.location.href = LOGIN_URL;
    }
    return resposta;
  });
};
