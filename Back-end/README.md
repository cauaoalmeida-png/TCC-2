# FactoryTrack — Back-end

API REST em **Node.js + Express + MySQL** que dá suporte às páginas do front-end
(`ocorrencia.html`, `checklist.html`, `historico.html`, `estoque.html`,
`cadastros.html`, `painel.html`).

## Como rodar

1. **Banco de dados** (XAMPP/MySQL precisa estar ligado)
   - Abra o phpMyAdmin (ou o cliente MySQL de sua preferência) e execute o
     arquivo `db.sql` — ele cria o banco `factorytrack_db`, todas as tabelas
     (incluindo `usuarios`, usada no login) e alguns dados iniciais de
     exemplo.

2. **Variáveis de ambiente**
   - Copie `.env.example` para `.env` e ajuste usuário/senha se o seu MySQL
     não for o padrão do XAMPP (`root` sem senha).
   - Confira também a variável `DATABASE_URL`, usada pelo **Prisma**. Ela
     precisa refletir os mesmos dados de `DB_HOST`/`DB_USER`/`DB_PASSWORD`/
     `DB_NAME`/`DB_PORT`, só que no formato de URL:
     ```
     DATABASE_URL="mysql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO"
     ```

3. **Instalar dependências**
   ```bash
   cd Back-end
   npm install
   ```
   O `npm install` já roda o `prisma generate` automaticamente no final
   (script `postinstall`), gerando o Prisma Client a partir de
   `prisma/schema.prisma`.

4. **Sincronizar o schema do Prisma com o banco** (só na primeira vez, ou
   sempre que `prisma/schema.prisma` mudar)
   ```bash
   npx prisma migrate dev --name init
   ```
   Isso cria (ou atualiza) as tabelas no banco a partir do schema do Prisma.
   Se você já rodou o `db.sql` manualmente e as tabelas já existem, pode
   pular esse passo — o Prisma só precisa que a `DATABASE_URL` esteja
   correta para funcionar.

5. **Iniciar o servidor**
   ```bash
   npm start
   ```
   Você verá:
   ```
    conectado ao banco de dados
    Servidor rodando em http://localhost:3000
   ```

### Comandos úteis do Prisma

| Comando                     | O que faz                                              |
|------------------------------|--------------------------------------------------------|
| `npx prisma generate`       | Gera o Prisma Client (já roda sozinho no `npm install`) |
| `npx prisma migrate dev`    | Cria/aplica migrations e atualiza o banco               |
| `npx prisma studio`         | Abre uma interface visual no navegador para ver os dados |

5. Abra o front-end normalmente com o **Live Server** (a URL base usada nas
   chamadas `fetch` já é `http://localhost:3000`, então não precisa mudar
   nada no front-end).

## Rotas disponíveis

| Método | Rota                          | Descrição                                  |
|--------|-------------------------------|---------------------------------------------|
| GET    | `/`                            | Health check da API                        |
| POST   | `/cadastrar-setor`            | Cadastra um setor                          |
| GET    | `/setores`                    | Lista todos os setores                     |
| DELETE | `/deletar-setor/:id`          | Remove um setor                            |
| POST   | `/cadastrar-maquina`          | Cadastra uma máquina                       |
| GET    | `/maquinas`                   | Lista todas as máquinas                    |
| DELETE | `/deletar-maquina/:id`        | Remove uma máquina                         |
| POST   | `/cadastrar-ocorrencia`       | Registra ocorrência ou checklist           |
| GET    | `/ocorrencias`                | Lista todas as ocorrências                 |
| PUT    | `/resolver-ocorrencia/:id`    | Marca ocorrência como resolvida            |
| GET    | `/pecas`                      | Lista o estoque de peças                   |
| POST   | `/cadastrar-peca`             | Cadastra uma nova peça                     |
| PUT    | `/atualizar-peca/:id`         | Atualiza a quantidade de uma peça          |
| DELETE | `/deletar-peca/:id`           | Remove uma peça                            |

## Colocando no ar (produção, de graça)

**1. Banco de dados** — crie um MySQL gratuito em algum desses serviços:
   [Railway](https://railway.app), [Clever Cloud](https://clever-cloud.com) ou
   [Aiven](https://aiven.io). Rode o `db.sql` lá (painel de query deles, ou
   conectando via DBeaver/MySQL Workbench com as credenciais que eles derem).

**2. Back-end** — suba esta pasta `Back-end/` no [Render](https://render.com)
   (ou Railway). No painel, configure as variáveis de ambiente com os mesmos
   nomes do `.env.example`, usando os dados do banco do passo 1, e defina
   `FRONTEND_URL` com a URL do seu front-end publicado (passo 3). O Render
   detecta o `package.json` e roda `npm install && npm start` sozinho.

**3. Front-end** — suba a pasta `TCC/` (exceto `Back-end/`) no
   [Vercel](https://vercel.com), [Netlify](https://netlify.com) ou
   [GitHub Pages](https://pages.github.com). Antes de publicar, abra
   `js/config.js` e troque `API_BASE_URL` pela URL pública do back-end
   (ex: `https://factorytrack-api.onrender.com`) — é a única linha que
   precisa mudar em todo o projeto.

> Dica: o plano gratuito do Render "dorme" após um tempo sem uso. A primeira
> requisição depois disso demora uns 30s para acordar o servidor — é normal.

## O que foi feito para adicionar o Prisma

- **`prisma/schema.prisma` criado**, mapeando as tabelas `setores`,
  `maquinas`, `ocorrencias`, `pecas` (já existentes em `db.sql`) e também
  `usuarios` (usada pela rota `/login`, mas que não existia no `db.sql`
  original — agora existe nos dois lugares).
- **`server.js` reescrito** para usar `PrismaClient` em vez de `mysql2`
  puro. Todas as rotas continuam com o mesmo caminho, método e formato de
  resposta — só a forma de consultar o banco mudou por dentro.
- **`mysql2` removido do `package.json`**: o Prisma já tem seu próprio
  driver de conexão com o MySQL, então essa dependência não é mais
  necessária.
- **Bug corrigido no `package.json`**: o script `postinstall` estava
  `"prisma skills sync || exit 0"`, que não é um comando válido do Prisma.
  Troquei para `"prisma generate"`, que é o comando correto para gerar o
  Prisma Client automaticamente após o `npm install`.
- **Bug corrigido no `db.sql`**: havia um `a` sobrando logo após o
  `CREATE TABLE setores` (`);a`), o que quebraria a execução do script SQL.
- **Bug corrigido no `.env`**: havia um `x` sobrando no final da linha do
  `DATABASE_URL`.
- Adicionei um usuário de exemplo (`admin` / `admin123`) no `db.sql` para
  vocês conseguirem testar a rota `/login` sem precisar cadastrar ninguém
  na mão.

> Como o `node_modules/` não foi enviado, não consegui rodar
> `npm install` nem testar a execução real por aqui. Depois de baixar os
> arquivos, rode `npm install` (que já vai gerar o Prisma Client sozinho)
> e depois `npx prisma migrate dev --name init` — ou, se preferir manter o
> fluxo do `db.sql` manual no phpMyAdmin, só garanta que a `DATABASE_URL`
> do `.env` está apontando pro banco certo.

## Observações importantes (leia antes de apresentar)

- **Login continua 100% no navegador.** O `js/auth.js` usa `localStorage`
  para cadastrar/logar usuários (`registrarUsuario`, `loginUsuario`) — isso
  não foi alterado. Existe um trecho morto em `auth.js` que tenta chamar
  `POST /cadastro`, mas ele nunca é executado porque não há nenhum
  formulário com `id="form-cadastro"` em nenhuma página. Se vocês quiserem
  migrar a autenticação para o banco também, é um próximo passo natural —
  posso te ajudar com isso depois, mas não mexi nessa parte para não quebrar
  o fluxo de login que já funciona.
- **URL da API centralizada.** Criei `js/config.js` com a constante
  `API_BASE_URL`. Todos os `fetch(...)` do projeto agora usam essa
  constante — pra apontar pra produção, troque só esse arquivo.
- **Pastas renomeadas para minúsculo (`css/`, `js/`, `pages/`).** O projeto
  tinha as pastas em maiúsculo (`CSS/`, `JS/`, `PAGES/`) mas a maioria dos
  links internos apontava em minúsculo. Isso funciona sem problema no
  Windows/Live Server (que não diferencia maiúscula de minúscula), mas
  quebraria tudo no Vercel/Netlify/GitHub Pages, que rodam em Linux e são
  *case-sensitive*. Já corrigi e testei localmente.
- **Dois links quebrados corrigidos:** `rbac.js` redirecionava para um
  `pages/login.html` que nunca existiu (agora vai para `index.html`, que é
  a página de login de verdade), e `Inicio.html` linkava para
  `PaginaInicial.html` (também inexistente — agora aponta para si mesma).
- **CSS do `index.html` não carregava.** O login referenciava `../css/...`
  como se estivesse uma pasta abaixo, mas ele está na raiz do projeto —
  corrigido para `css/...`.
- **`painel.html` calcula o status das máquinas usando `getOcorrencias()`
  (localStorage)**, enquanto setores/máquinas já vêm do banco via `fetch`.
  Isso é uma inconsistência do front-end (não do back-end): se vocês
  cadastrarem uma ocorrência pelo banco mas nunca tiverem usado o
  localStorage, o painel pode não refletir o status real. A correção é
  trocar `getOcorrencias()` por `fetch('http://localhost:3000/ocorrencias')`
  dentro de `painel.html`, mas como isso é uma mudança de front-end, deixei
  fora do escopo do que foi pedido (só back-end).
