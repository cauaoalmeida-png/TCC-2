document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.header');
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  const revealItems = document.querySelectorAll('.reveal');
  const heroImage = document.querySelector('.hero-image');
  const heroContent = document.querySelector('.hero-content');
  const parallaxItems = document.querySelectorAll('[data-parallax]');
  // Se o computador pede "menos movimento" (acessibilidade), os efeitos ficam desligados
  const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Barra laranja no topo mostrando quanto da página já foi lido
  const progresso = document.createElement('div');
  progresso.className = 'scroll-progress';
  progresso.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progresso);

  let agendado = false;
  function aoRolar() {
    agendado = false;
    const y = window.scrollY;
    const alturaTela = window.innerHeight;
    const maximo = document.documentElement.scrollHeight - alturaTela;

    header?.classList.toggle('scrolled', y > 24);
    progresso.style.transform = `scaleX(${maximo > 0 ? Math.min(1, y / maximo) : 0})`;

    if (menosMovimento) return;

    // Topo: a foto desce mais devagar que a página e o texto vai sumindo
    if (y < alturaTela * 1.3) {
      if (heroImage) heroImage.style.translate = `0 ${y * 0.35}px`;
      if (heroContent) {
        heroContent.style.translate = `0 ${y * -0.12}px`;
        heroContent.style.opacity = String(Math.max(0, 1 - y / (alturaTela * 0.8)));
      }
    }

    // Demais fotos: deslocamento suave conforme passam pela tela (efeito de profundidade)
    parallaxItems.forEach(item => {
      const caixa = item.parentElement.getBoundingClientRect();
      if (caixa.bottom < 0 || caixa.top > alturaTela) return;
      const posicao = (caixa.top + caixa.height / 2 - alturaTela / 2) / alturaTela;
      item.style.translate = `0 ${(posicao * -50).toFixed(1)}px`;
    });
  }

  window.addEventListener('scroll', () => {
    if (!agendado) { agendado = true; requestAnimationFrame(aoRolar); }
  }, { passive: true });
  window.addEventListener('resize', aoRolar);
  aoRolar();

  toggle?.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', String(nav?.classList.contains('open') || false));
  });

  nav?.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
    });
  });

  if (!('IntersectionObserver' in window) || menosMovimento) {
    revealItems.forEach(item => item.classList.add('is-visible'));
    return;
  }

  // Os títulos grandes começam "mascarados" (sem área visível), então quem é observado
  // é o bloco em volta deles; os demais elementos são observados diretamente
  const alvos = new Map();
  revealItems.forEach(item => {
    const observado = item.classList.contains('display-title') ? item.parentElement : item;
    if (!alvos.has(observado)) alvos.set(observado, []);
    alvos.get(observado).push(item);
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      alvos.get(entry.target).forEach(item => item.classList.add('is-visible'));
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  alvos.forEach((_, observado) => observer.observe(observado));
});
