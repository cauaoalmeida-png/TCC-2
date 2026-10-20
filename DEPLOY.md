# FactoryTrack na nuvem (Vercel + TiDB Cloud)

Com isso o sistema fica num link público (ex.: `https://factory-track.vercel.app`),
sem XAMPP e sem `npm start`. Tudo no plano gratuito, sem cartão.

- **Vercel**: hospeda o site (`index.html`, `css/`, `js/`, `pages/`) e roda a API
  Express como função (`api/index.js`). A cada push na `main` ela publica de novo.
- **TiDB Cloud (plano Starter)**: banco compatível com MySQL na nuvem. O Prisma
  conecta nele igual ao MySQL do XAMPP.

No deploy, a Vercel roda `npm run db:setup`, que cria as tabelas pelo
`prisma/schema.prisma` (`prisma db push`) e insere os setores, máquinas e peças de
exemplo só se as tabelas estiverem vazias (`prisma/seed.js`). Não precisa rodar o `db.sql`.

## 1. Criar o banco no TiDB Cloud

1. Crie a conta em https://tidbcloud.com (pode entrar com Google ou GitHub).
2. Crie um cluster **Starter** (gratuito). Na região, escolha **AWS N. Virginia
   (us-east-1)**, que é onde a Vercel roda as funções por padrão.
3. No cluster, clique em **Connect**:
   - Connect With: **General**
   - Clique em **Generate Password** e guarde a senha (ela só aparece uma vez).
4. Anote **HOST**, **PORT** (4000) e **USERNAME** (algo como `2abc123xyz.root`).

## 2. Criar o projeto na Vercel

1. Crie a conta em https://vercel.com entrando com o GitHub da conta
   `cauaoalmeida-png`.
2. **Add New → Project** → importe o repositório `TCC-2`.
3. Deixe **Root Directory** como está (a raiz) e **Framework Preset: Other**.
   Os comandos de instalação e build já vêm do `vercel.json`.
4. Abra **Environment Variables** e cadastre:

| Nome | Valor |
|------|-------|
| `DB_HOST` | o HOST do TiDB |
| `DB_PORT` | `4000` |
| `DB_USER` | o USERNAME do TiDB (com o prefixo, ex.: `2abc123xyz.root`) |
| `DB_PASSWORD` | a senha gerada |
| `DB_NAME` | `factorytrack_db` |
| `DB_SSL` | `true` |
| `DATABASE_URL` | `mysql://USUARIO:SENHA@HOST:4000/factorytrack_db?sslaccept=strict` |
| `AUTH_SECRET` | uma frase longa e aleatória (ex.: gerada em https://generate-secret.vercel.app/32) |
| `INITIAL_ADMIN_NAME` | nome do chefe geral |
| `INITIAL_ADMIN_USERNAME` | login do chefe geral |
| `INITIAL_ADMIN_PASSWORD` | senha do chefe geral (mínimo 8 caracteres) |

   Se a senha do banco tiver caracteres especiais (`@ : / ? # %`), troque-os no
   `DATABASE_URL` pelo código URL (ex.: `@` vira `%40`). Nos outros campos use a senha normal.

   O `AUTH_SECRET` é obrigatório na Vercel: sem ele cada função gera uma chave
   diferente e o login cai a toda hora.

5. Clique em **Deploy**. Ao terminar, a Vercel mostra o link público.

## 3. Primeiro acesso

1. Abra o link e entre com o `INITIAL_ADMIN_USERNAME` e a senha.
2. Em **Cadastros**, crie as contas da equipe.
3. Depois que a conta de chefe existir, as variáveis `INITIAL_ADMIN_*` podem ser
   apagadas na Vercel (Settings → Environment Variables). Elas só são usadas
   quando não há nenhuma conta no banco.

## Observações

- O aviso ao supervisor continua pelo link do WhatsApp (`wa.me`), que é aberto no
  celular/PC de quem registra a ocorrência; funciona igual na nuvem. Confira o
  número em `SUPERVISOR_WPP` (`js/pages/ocorrencia.js` e `js/pages/checklist.js`).
- Para mudar o nome do link, vá em Settings → Domains na Vercel
  (ex.: `factorytrack-senai.vercel.app`).
- Rodar localmente continua igual: XAMPP + `npm start` em `Back-end/`.
  Para usar o banco da nuvem no PC, copie as mesmas variáveis para o `Back-end/.env`.
