/* ============================================
   RBAC / Controle de Acesso — FactoryTrack
   - sessionStorage: ft_sessao
   - cargos: chefe_geral, gerente, operador
   ============================================ */

function setNextUrl() {
  // Salva a URL atual (inclui querystring/hash) para redirecionar após login.
  try {
    const url = window.location.href;
    sessionStorage.setItem('ft_next_url', url);
  } catch (e) {}
}

function clearNextUrl() {
  try { sessionStorage.removeItem('ft_next_url'); } catch (e) {}
}

function goBackOrLogin() {
  // Quando não estiver logado, sempre força login preservando a página destino.
  // Isso evita frustração (principal/páginas protegidas abrindo e depois não voltando).
  setNextUrl();
  window.location.href = '../index.html';
}

function requireAuth() {
  const sess = getSessao && getSessao();
  if (!sess) {
    goBackOrLogin();
    return false;
  }
  return true;
}

function requireRole(rolesAllowed) {
  const sess = getSessao && getSessao();
  if (!sess) {
    goBackOrLogin();
    return false;
  }
  const cargo = sess.cargo;
  if (!rolesAllowed.includes(cargo)) {
    alert('Acesso negado: permissões insuficientes.');
    // Sem salvar next_url aqui: a pessoa está logada, apenas recebeu bloqueio por cargo.
    // Volta para a tela anterior quando possível.
    try {
      if (window.history.length > 1) {
        window.history.back();
        return false;
      }
    } catch (e) {}
    window.location.href = 'painel.html';
    return false;
  }
  return true;
}


function requireSupervisor() {
  // Supervisor/chef/gerente
  return requireRole(['chefe_geral', 'gerente']);
}

function isOperator() {
  const sess = getSessao && getSessao();
  return !!sess && sess.cargo === 'operador';
}

