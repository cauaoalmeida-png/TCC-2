#!/usr/bin/env bash
# Build da Vercel: prepara o banco e monta a pasta public/ com o site estático.
# Fica num arquivo porque a Vercel só aceita até 256 caracteres no buildCommand.
set -euo pipefail

# Roda sempre a partir da raiz do repositório, mesmo chamado de outra pasta.
cd "$(dirname "$0")/.."

(cd Back-end && npm run db:setup)

rm -rf public
mkdir public
cp -r apresentacao.html privacidade.html termos.html css js pages img public/
# Navegadores e o Google procuram /favicon.ico na raiz do site.
cp img/favicon.ico public/favicon.ico
cp seo/robots.txt seo/sitemap.xml public/
cp index.html public/sistema.html
cp apresentacao.html public/index.html
