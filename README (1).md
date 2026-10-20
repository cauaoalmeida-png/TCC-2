# FactoryTrack 

Sistema web de monitoramento de processos para indústrias de manufatura.  
Front-end em HTML, CSS e JavaScript, com API Node.js/Express e banco MySQL.

---

##  Sobre o Projeto

O FactoryTrack conecta operadores de chão de fábrica com supervisores em tempo real.  
Quando um problema acontece, o operador registra a ocorrência pelo site e o supervisor recebe um alerta automático direto no WhatsApp — sem burocracia, sem papelada.

---

## Como Rodar

1. Baixe ou clone o projeto
2. Abra a pasta `factorytrack/` no VSCode
3. Inicie o MySQL pelo XAMPP
4. No terminal do VSCode, execute `cd Back-end` e `npm start`
5. Abra `http://localhost:3000` para entrar no sistema pelo login. Depois do
   login, o sistema abre na página Início. A página de apresentação do projeto
   fica separada em `http://localhost:3000/apresentacao.html`.

O mesmo servidor inicia a API e o site. Não é necessário abrir o front-end
com o Live Server. Para detalhes da configuração do banco, consulte
[`Back-end/README.md`](./Back-end/README.md).

Cada conta individual deve usar o e-mail corporativo fornecido ao trabalhador
pela empresa. O Chefe Geral cadastra esse e-mail e define o cargo em
**Cadastros → Contas dos Trabalhadores**.

---

## Estrutura de Pastas

```
factorytrack/
├── index.html              → Login do sistema (entrada do site)
├── apresentacao.html       → Página de apresentação do projeto (fora do sistema)
├── css/
│   ├── style.css           → Estilos globais e componentes reutilizáveis
│   ├── header.css          → Estilos do cabeçalho e menu de navegação
│   ├── home.css            → Estilos exclusivos da página inicial
│   ├── landing.css         → Estilos da página de apresentação
│   ├── forms.css           → Estilos dos formulários
│   └── footer.css          → Estilos do rodapé
├── js/
│   ├── auth.js              → Sessão individual e envio do token à API
│   ├── data.js              → Dados de demonstração
│   ├── rbac.js              → Controle de acesso por cargo
│   ├── navigation.js        → Menu mobile e encerramento da sessão
│   └── pages/               → Lógica específica de cada página
│       ├── cadastros.js
│       ├── checklist.js
│       ├── estoque.js
│       ├── guindastes.js
│       ├── historico.js
│       ├── ocorrencia.js
│       └── painel.js
└── pages/
    ├── Inicio.html         → Página inicial do sistema (após o login)
    ├── painel.html         → Painel de status por setor e máquina
    ├── ocorrencia.html     → Formulário de registro de ocorrência
    ├── historico.html      → Histórico com filtros e resolução de ocorrências
    └── cadastros.html      → Gerenciamento de setores e máquinas
```

---

## ⚙️ Funcionalidades

### Painel de Status
- Visualiza o status de todas as máquinas por setor (Funcionando / Atenção / Parado)
- Status calculado automaticamente com base nas ocorrências pendentes
- Filtros por setor e por status
- Botão de atalho para registrar nova ocorrência diretamente do painel

### Registrar Ocorrência
- Acesso com conta individual
- Campos: setor, máquina, tipo de ocorrência, turno e descrição
- Nome do trabalhador preenchido pelo sistema com base na conta autenticada
- Upload de foto do problema (opcional)
- Após envio, gera automaticamente um link para alertar o supervisor pelo WhatsApp

### Histórico
- Lista todas as ocorrências da mais recente para a mais antiga
- Filtros por setor, tipo, turno e status
- Resumo com total de pendentes, resolvidas e geral
- Botão "Marcar como Resolvido" com modal para registrar o que foi feito

### Cadastros
- Cadastro de setores com nome e responsável
- Cadastro de máquinas vinculadas a um setor, com número de série
- Exclusão individual de setores e máquinas
- O Chefe Geral pode criar contas individuais, atribuir cargos e ativar/desativar usuários
- Alimenta automaticamente os dropdowns do formulário de ocorrência

### Acesso por cargo
- **Operador:** registra ocorrências e consulta informações de trabalho.
- **Gerente:** acessa ferramentas de supervisão existentes no sistema.
- **Chefe Geral:** gerencia contas e acessa as áreas restritas.
- As permissões são conferidas na API, além de serem refletidas na interface.

---

## Armazenamento e identificação

Contas, cargos e dados operacionais são armazenados no MySQL pelo back-end.
A sessão permanece no navegador até seu encerramento ou expiração. Registros
de ocorrência e checklist usam a identidade autenticada, não um nome digitado
manualmente.

---

## Responsividade

O site foi desenvolvido para funcionar em desktop, tablet e celular.  
O menu de navegação vira um menu hamburguer em telas menores que 900px.

---

## Tecnologias Utilizadas

- HTML5
- CSS3 (variáveis CSS, Grid, Flexbox)
- JavaScript ES6+ (sem frameworks)
- Font Awesome 6.4 (ícones)
- Google Fonts — Rajdhani + DM Sans
- Node.js, Express e MySQL para autenticação e dados operacionais
- API do WhatsApp (wa.me) para alertas

---

## Equipe

Projeto desenvolvido como TCC do curso técnico.  
**Membros:** Mauricio, Gabriel, Hugo Harley, Cauã Oliveira

---

## Observações

- O número de WhatsApp do supervisor está definido na variável `SUPERVISOR_WPP` dentro do arquivo `pages/ocorrencia.html`. Altere para o número real antes de apresentar.
- Os dados fictícios iniciais podem ser editados diretamente no arquivo `js/data.js`.