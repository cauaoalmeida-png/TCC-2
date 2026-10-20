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
    saveSessao({ token: resultado.token, usuario: resultado.usuario });
    return { ok: true, user: resultado.usuario };
  } catch (erro) {
    console.error('Erro ao conectar para autenticação:', erro);
    return { ok: false, msg: 'Não foi possível conectar ao servidor.' };
  }
}

function cargoLabel(cargo) {
  const map = { chefe_geral: 'Chefe Geral', gerente: 'Gerente', operador: 'Operador' };
  return map[cargo] || cargo;
}

function cargoBadgeStyle(cargo) {
  const map = {
    chefe_geral: 'background:#fce7f3;color:#9d174d',
    gerente: 'background:#dbeafe;color:#1d4ed8',
    operador: 'background:#dcfce7;color:#16a34a'
  };
  return map[cargo] || '';
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
      window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
    }
    return resposta;
  });
};
