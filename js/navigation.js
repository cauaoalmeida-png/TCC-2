/* NAVIGATION */

// Páginas que o operador não pode abrir (o servidor também bloqueia)
const PAGINAS_SO_CHEFIA = ['checklist.html', 'guindastes.html', 'cadastros.html'];

document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.getElementById('menuToggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    // Telas menores: o menu abre como gaveta lateral
    const definirMenu = (aberto) => {
      nav.classList.toggle('open', aberto);
      document.body.classList.toggle('menu-aberto', aberto);
      toggle.setAttribute('aria-expanded', String(aberto));
      toggle.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
    };

    toggle.addEventListener('click', (evento) => {
      evento.stopPropagation();
      definirMenu(!nav.classList.contains('open'));
    });

    // Fecha ao clicar fora da gaveta, ao apertar Esc ou ao voltar para tela grande
    document.addEventListener('click', (evento) => {
      if (nav.classList.contains('open') && !nav.contains(evento.target)) definirMenu(false);
    });
    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape' && nav.classList.contains('open')) {
        definirMenu(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (mq) => {
      if (mq.matches) definirMenu(false);
    });
  }

  if (typeof getSessao !== 'function' || typeof clearSessao !== 'function') return;
  const sessao = getSessao();
  const container = document.querySelector('.header .container');
  if (!sessao || !container) return;

  // Operador não vê links para áreas que não pode acessar
  if (sessao.usuario.cargo === 'operador') {
    document.querySelectorAll('.nav a, .footer a, .cta a').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (PAGINAS_SO_CHEFIA.some(pagina => href.endsWith(pagina))) {
        (link.closest('li') || link).remove();
      }
    });
  }

  const actions = document.createElement('div');
  actions.className = 'header-actions';

  const usuario = document.createElement('div');
  usuario.className = 'header-user';
  usuario.innerHTML = '<i class="fas fa-circle-user" aria-hidden="true"></i>' +
    '<div class="header-user-info"><span class="header-user-name"></span><span class="header-user-role"></span></div>';
  usuario.querySelector('.header-user-name').textContent = sessao.usuario.nome;
  usuario.querySelector('.header-user-role').textContent =
    typeof cargoLabel === 'function' ? cargoLabel(sessao.usuario.cargo) : sessao.usuario.cargo;
  actions.appendChild(usuario);

  const sair = document.createElement('button');
  sair.type = 'button';
  sair.className = 'btn header-logout';
  sair.innerHTML = '<i class="fas fa-right-from-bracket" aria-hidden="true"></i><span>Sair</span>';
  sair.setAttribute('aria-label', `Encerrar sessão de ${sessao.usuario.nome}`);
  sair.title = `Encerrar sessão de ${sessao.usuario.nome}`;
  sair.addEventListener('click', () => {
    clearSessao();
    window.location.href = LOGIN_URL;
  });
  actions.appendChild(sair);
  if (toggle) actions.appendChild(toggle);
  container.appendChild(actions);
});
