/* NAVIGATION */

// Páginas que o operador não pode abrir (o servidor também bloqueia)
const PAGINAS_SO_CHEFIA = ['checklist.html', 'guindastes.html', 'cadastros.html'];

// Menu lateral escondido ou não (telas grandes). A escolha fica salva no navegador.
const CHAVE_MENU_RECOLHIDO = 'ft_menu_recolhido';
const telaGrande = window.matchMedia('(min-width: 1024px)');

function menuRecolhidoSalvo() {
  try { return localStorage.getItem(CHAVE_MENU_RECOLHIDO) === '1'; } catch (e) { return false; }
}

// Aplica já, antes de a página aparecer, para o menu não "piscar" aberto
document.documentElement.classList.toggle('menu-recolhido', menuRecolhidoSalvo());

document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.getElementById('menuToggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    // Telas menores: o menu abre como gaveta lateral
    const definirGaveta = (aberto) => {
      nav.classList.toggle('open', aberto);
      document.body.classList.toggle('menu-aberto', aberto);
      atualizarBotao();
    };

    // Telas grandes: o ☰ esconde ou mostra o menu lateral
    const definirRecolhido = (recolhido) => {
      document.documentElement.classList.toggle('menu-recolhido', recolhido);
      try { localStorage.setItem(CHAVE_MENU_RECOLHIDO, recolhido ? '1' : '0'); } catch (e) {}
      atualizarBotao();
    };

    function atualizarBotao() {
      const aberto = telaGrande.matches
        ? !document.documentElement.classList.contains('menu-recolhido')
        : nav.classList.contains('open');
      toggle.setAttribute('aria-expanded', String(aberto));
      const texto = aberto ? 'Esconder menu' : 'Mostrar menu';
      toggle.setAttribute('aria-label', texto);
      toggle.title = texto;
    }

    toggle.addEventListener('click', (evento) => {
      evento.stopPropagation();
      if (telaGrande.matches) {
        definirRecolhido(!document.documentElement.classList.contains('menu-recolhido'));
      } else {
        definirGaveta(!nav.classList.contains('open'));
      }
    });

    // Gaveta (telas menores): fecha ao clicar fora, ao apertar Esc ou ao virar tela grande
    document.addEventListener('click', (evento) => {
      if (nav.classList.contains('open') && !nav.contains(evento.target)) definirGaveta(false);
    });
    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape' && nav.classList.contains('open')) {
        definirGaveta(false);
        toggle.focus();
      }
    });
    telaGrande.addEventListener('change', () => {
      if (nav.classList.contains('open')) definirGaveta(false);
      else atualizarBotao();
    });

    atualizarBotao();
    // Liga a animação só depois que a página já apareceu
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.documentElement.classList.add('menu-animado');
    }));
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
