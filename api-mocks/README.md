# FactoryTrack — API de Mocks (Express + Zod)

Atividade **"Codificação: Mocks no Express e Thunder Client"**.

Esta pasta é um projeto **separado** do sistema que está em produção (`Back-end/`).
Ela reproduz o mesmo contrato de API do FactoryTrack (mesmas rotas e campos), mas:

- **não usa Prisma nem banco de dados**: os controllers devolvem objetos JSON estáticos (mocks), que ficam em `src/mocks/dados.js`;
- **valida tudo com Zod** em um middleware (`src/middlewares/validar.js`) antes de chegar no controller. Se os dados estiverem errados, a API responde **400** com a lista de campos inválidos.

## Estrutura

```
api-mocks/
├── src/
│   ├── server.js              # sobe o Express na porta 3333
│   ├── routes.js              # todas as rotas da API
│   ├── middlewares/
│   │   └── validar.js         # middleware que aplica o schema do Zod
│   ├── schemas/               # regras de validação (Zod) por entidade
│   ├── controllers/           # controllers que devolvem os mocks
│   └── mocks/dados.js         # JSON estático que simula o banco
└── thunder/
    └── thunder-collection_FactoryTrack-API-Mocks.json   # coleção pronta p/ importar
```

## Como rodar

```bash
cd api-mocks
npm install
npm start        # ou: npm run dev (reinicia sozinho com nodemon)
```

A API sobe em **http://localhost:3333** (porta diferente da 3000 do sistema real, para os dois poderem rodar juntos).

## Rotas

| Entidade | Método | Rota | Validação Zod |
|---|---|---|---|
| Saúde | GET | `/api/health` | — |
| Login | POST | `/login` | e-mail válido, senha obrigatória |
| Usuários | GET | `/me` | — |
| | GET | `/usuarios` | — |
| | POST | `/usuarios` | nome, e-mail, senha ≥ 8, cargo (`operador`/`gerente`/`chefe_geral`) |
| | PUT | `/usuarios/:id/status` | id numérico, `ativo` boolean |
| | PUT | `/usuarios/:id/cargo` | id numérico, cargo válido |
| Setores | GET | `/setores` | — |
| | POST | `/cadastrar-setor` | `nome_setor`, `responsavel` |
| | DELETE | `/deletar-setor/:id` | id inteiro > 0 |
| Máquinas | GET | `/maquinas` | — |
| | POST | `/cadastrar-maquina` | `nome_maquina`, `setor_associado`, `numero_serie` opcional |
| | DELETE | `/deletar-maquina/:id` | id inteiro > 0 |
| Ocorrências | GET | `/ocorrencias` | — |
| | POST | `/cadastrar-ocorrencia` | setor, máquina, `tipo` e `turno` (Manhã/Tarde/Noite) da lista, checklist opcional |
| | PUT | `/resolver-ocorrencia/:id` | `resolucao` obrigatória, data ISO opcional |
| | DELETE | `/ocorrencias/:id` | id inteiro > 0 |
| Estoque | GET | `/pecas` | — |
| | POST | `/cadastrar-peca` | nome, `qtd` e `min` inteiros ≥ 0 |
| | PUT | `/atualizar-peca/:id` | `qtd` inteiro ≥ 0 |
| | DELETE | `/deletar-peca/:id` | id inteiro > 0 |
| Guindastes | GET | `/guindastes` | — |
| | POST | `/cadastrar-guindaste` | `modelo` obrigatório |
| | DELETE | `/deletar-guindaste/:id` | id inteiro > 0 |
| Aluguéis | GET | `/alugueis` | — |
| | POST | `/alugar-guindaste` | `guindasteId` número, cliente, data `AAAA-MM-DD` |
| | PUT | `/devolver-aluguel/:id` | id inteiro > 0 |

Exemplo de resposta quando o Zod barra a requisição:

```json
{
  "erro": "Dados inválidos.",
  "detalhes": [
    { "campo": "qtd", "mensagem": "qtd não pode ser negativa." },
    { "campo": "min", "mensagem": "min precisa ser um número." }
  ]
}
```

## Testando no Thunder Client

1. No VS Code, instale a extensão **Thunder Client** (ícone de raio na barra lateral).
2. Rode a API (`npm start` dentro de `api-mocks`).
3. No Thunder Client, abra a aba **Collections** → menu **☰** → **Import** e escolha
   `api-mocks/thunder/thunder-collection_FactoryTrack-API-Mocks.json`.
4. A coleção **FactoryTrack - API Mocks** aparece com 46 requisições divididas em pastas.
   Para cada rota existe uma versão **(válido)** e uma versão **ERRO**, com dados errados de propósito.
5. Clique em cada requisição e em **Send**. As válidas respondem 200/201 e as de erro respondem **400** com a mensagem do Zod.
   Cada requisição já tem um teste de status code (aba **Tests**), então aparece ✔ quando o resultado é o esperado.
6. Para rodar tudo de uma vez: clique nos **⋯** da coleção → **Run All**. O resultado mostra todas as requisições passando.
