# Teste de carga do FactoryTrack

Simula de 30 a 80 pessoas usando o sistema ao mesmo tempo e mede o tempo de
resposta e os erros. Não precisa instalar nada além do Node (18 ou mais novo).

**Rode sempre contra o sistema no seu PC (localhost), nunca contra o site da
Vercel.** O script recusa endereços que não sejam localhost.

## Passo a passo

1. Ligue o MySQL do XAMPP e rode o sistema: `cd Back-end` e `npm start`.
2. No sistema, em Cadastros, crie duas contas de teste:
   - `chefe@teste.com` (Chefe Geral), senha `senha12345`
   - `operador@teste.com` (Operador), senha `senha12345`
3. Abra o Gerenciador de Tarefas (Ctrl+Shift+Esc), aba Detalhes, e deixe à
   vista o `node.exe` e o `mysqld.exe` (CPU e memória).
4. Em outro terminal, na pasta do projeto:

```
node teste-carga/carga.js --usuarios 30 --duracao 60
node teste-carga/carga.js --usuarios 80 --duracao 60
node teste-carga/carga.js --usuarios 80 --duracao 60 --estresse
node teste-carga/carga.js --limpar
```

O último comando apaga as ocorrências criadas pelo teste (todas começam com
`[TESTE DE CARGA]`).

## Parâmetros

| Parâmetro | Padrão | O que faz |
|---|---|---|
| `--usuarios` | 30 | Quantas pessoas simuladas |
| `--duracao` | 60 | Segundos de teste (depois da entrada) |
| `--rampa` | 15 | Segundos para todas as pessoas "entrarem" |
| `--estresse` | desligado | Tira as pausas entre cliques (pior caso, bem acima do uso real) |
| `--chefe-email`, `--chefe-senha` | chefe@teste.com | Conta de chefia usada para ler |
| `--operador-email`, `--operador-senha` | operador@teste.com | Conta usada para registrar ocorrências |
| `--url` | http://localhost:3000 | Endereço do sistema |
| `--limpar` | | Apaga as ocorrências de teste |

## O que cada pessoa simulada faz

A cada 1 a 4 segundos (o tempo de alguém ler a tela e clicar), escolhe uma ação:
abrir o painel (40%, pede setores, máquinas e ocorrências juntos), abrir o
histórico (20%), abrir o estoque (15%), registrar uma ocorrência (15%) ou
conferir a sessão (10%).

O script faz só 2 logins e todas as pessoas reaproveitam o token, então o
limite de 10 logins por minuto por IP não interfere.

## Como ler o resultado

- **p95**: 95% das respostas foram mais rápidas que esse valor. É o número
  principal. Abaixo de 800 ms está bom; de 800 a 2000 ms as pessoas sentem
  demora; acima de 2000 ms parece travado.
- **erros**: qualquer status diferente de 200/201. Deve ficar em 0%.
  `500` é erro no servidor ou banco, `timeout_30s` é o sistema não responder,
  `429` é limite de tentativas, `401` é token inválido.
- **requisições por segundo**: quanto trabalho o sistema aguentou.
- No Gerenciador de Tarefas: se o `node.exe` encostar em 100% de um núcleo,
  o gargalo é o servidor; se for o `mysqld.exe`, é o banco. Memória do Node
  subindo sem parar durante o teste indicaria vazamento.
