#!/usr/bin/env bash
# Build da Vercel: prepara o banco e monta a pasta public/ com o site estático.
# Fica num arquivo porque a Vercel só aceita até 256 caracteres no buildCommand.
set -euo pipefail

(cd Back-end && npm run db:setup)

rm -rf public
mkdir public
cp -r apresentacao.html css js pages \
  favicon.svg favicon.ico apple-touch-icon.png og-image.jpg logo-512.png public/
cp seo/robots.txt seo/sitemap.xml public/
cp index.html public/sistema.html
cp apresentacao.html public/index.html
