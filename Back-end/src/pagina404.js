// Página "não encontrada" para quem abre no navegador um endereço que não existe.
// Fica em texto aqui (e não num .html) para funcionar igual na Vercel, onde a
// função da API não leva os arquivos do site junto.

const PAGINA_404 = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Página não encontrada - FactoryTrack</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <style>
    :root { --primary: #1a2f4e; --accent: #FF8C42; --bg: #f4f6f9; --text: #1e293b; --muted: #64748b; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text);
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
    main { background: #fff; border-radius: 12px; box-shadow: 0 6px 18px rgba(15,23,42,0.08); padding: 40px 32px; max-width: 460px; width: 100%; text-align: center; }
    .codigo { font-size: 64px; font-weight: 700; color: var(--accent); line-height: 1; }
    h1 { font-size: 24px; color: var(--primary); margin: 12px 0 8px; }
    p { color: var(--muted); line-height: 1.6; }
    .acoes { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 24px; }
    a { display: inline-block; padding: 10px 18px; border-radius: 8px; font-weight: 600; text-decoration: none; }
    .principal { background: var(--primary); color: #fff; }
    .secundario { border: 2px solid var(--primary); color: var(--primary); }
    a:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  </style>
</head>
<body>
  <main>
    <div class="codigo" aria-hidden="true">404</div>
    <h1>Página não encontrada</h1>
    <p>O endereço que você abriu não existe ou foi alterado. Confira o link ou volte para uma das páginas abaixo.</p>
    <div class="acoes">
      <a class="principal" href="/pages/Inicio.html">Ir para o sistema</a>
      <a class="secundario" href="/">Página inicial do site</a>
    </div>
  </main>
</body>
</html>`;

module.exports = PAGINA_404;
