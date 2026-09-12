/* ============================================
   AUTH.JS — Sistema de Usuários - FactoryTrack
   Cargos: chefe_geral, gerente, operador
   ============================================ */

const AUTH_USERS_KEY    = 'ft_usuarios';
const AUTH_SESSION_KEY  = 'ft_sessao';

function getUsuarios() { return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]'); }
function saveUsuarios(l) { localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(l)); }

function getSessao() {
  try { return JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY)); } catch { return null; }
}
function saveSessao(u) { sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(u)); }
function clearSessao() { sessionStorage.removeItem(AUTH_SESSION_KEY); }

function temChefe() {
  return getUsuarios().some(u => u.cargo === 'chefe_geral');
}

function temUsuarios() {
  return getUsuarios().length > 0;
}

function registrarUsuario(nome, senha, cargo) {
  const lista = getUsuarios();
  if (lista.find(u => u.nome.toLowerCase() === nome.toLowerCase())) return { ok: false, msg: 'Já existe um usuário com esse nome.' };
  const novoUser = { id: Date.now(), nome, senha, cargo };
  lista.push(novoUser);
  saveUsuarios(lista);
  return { ok: true, user: novoUser };
}

function loginUsuario(nome, senha) {
  const user = getUsuarios().find(u => u.nome.toLowerCase() === nome.toLowerCase() && u.senha === senha);
  if (!user) return { ok: false, msg: 'Nome ou senha incorretos.' };
  saveSessao(user);
  return { ok: true, user };
}

function atualizarCargo(userId, novoCargo) {
  const lista = getUsuarios();
  const idx = lista.findIndex(u => u.id === userId);
  if (idx === -1) return false;
  lista[idx].cargo = novoCargo;
  saveUsuarios(lista);
  return true;
}

function excluirUsuario(userId) {
  saveUsuarios(getUsuarios().filter(u => u.id !== userId));
}

function cargoLabel(cargo) {
  const map = { chefe_geral: 'Chefe Geral', gerente: 'Gerente', operador: 'Operador', pendente: 'Pendente' };
  return map[cargo] || cargo;
}

function cargoBadgeStyle(cargo) {
  const map = {
    chefe_geral: 'background:#fce7f3;color:#9d174d',
    gerente: 'background:#dbeafe;color:#1d4ed8',
    operador: 'background:#dcfce7;color:#16a34a',
    pendente: 'background:#fef9c3;color:#ca8a04'
  };
  return map[cargo] || '';
}
