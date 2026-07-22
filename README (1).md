# FactoryTrack 

Sistema web de monitoramento de processos para indústrias de manufatura.  
Desenvolvido com HTML, CSS e JavaScript puro — sem frameworks, sem instalação.

---

##  Sobre o Projeto

O FactoryTrack conecta operadores de chão de fábrica com supervisores em tempo real.  
Quando um problema acontece, o operador registra a ocorrência pelo site e o supervisor recebe um alerta automático direto no WhatsApp — sem burocracia, sem papelada.

---

##  Como Rodar

1. Baixe ou clone o projeto
2. Abra a pasta `factorytrack/` no VSCode
3. Instale a extensão **Live Server** no VSCode (se ainda não tiver)
4. Clique com o botão direito em `index.html` → **Open with Live Server**
5. O site abrirá no navegador automaticamente

> Não precisa de servidor, banco de dados ou qualquer instalação adicional.  
> Todos os dados são salvos no `localStorage` do navegador.

---

## Estrutura de Pastas

```
factorytrack/
├── index.html              → Página inicial
├── css/
│   ├── style.css           → Estilos globais e componentes reutilizáveis
│   ├── header.css          → Estilos do cabeçalho e menu de navegação
│   ├── home.css            → Estilos exclusivos da página inicial
│   ├── forms.css           → Estilos dos formulários
│   └── footer.css          → Estilos do rodapé
├── js/
│   ├── data.js             → Dados fictícios iniciais e funções do localStorage
│   └── navigation.js       → Menu mobile (hamburguer)
└── pages/
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
- Formulário rápido acessível por qualquer operador, sem login
- Campos: setor, máquina, tipo de ocorrência, turno, operador e descrição
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
- Alimenta automaticamente os dropdowns do formulário de ocorrência

---

##  Armazenamento de Dados

O projeto usa o `localStorage` do navegador para simular um banco de dados.  
Os dados são iniciados automaticamente com informações fictícias na primeira vez que o site é aberto.

| Chave              | Conteúdo                        |
|--------------------|----------------------------------|
| `ft_setores`       | Lista de setores cadastrados     |
| `ft_maquinas`      | Lista de máquinas cadastradas    |
| `ft_ocorrencias`   | Histórico de ocorrências         |
| `ft_initialized`   | Controle de inicialização        |

> Para resetar os dados e voltar ao estado inicial, abra o console do navegador (F12) e execute:  
> `localStorage.clear(); location.reload();`

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
- localStorage (persistência de dados)
- API do WhatsApp (wa.me) para alertas

---

## Equipe

Projeto desenvolvido como TCC do curso técnico.  
**Membros:** Mauricio, Gabriel, Hugo Harley, Cauã Oliveira

---

## Observações

- O número de WhatsApp do supervisor está definido na variável `SUPERVISOR_WPP` dentro do arquivo `pages/ocorrencia.html`. Altere para o número real antes de apresentar.
- Os dados fictícios iniciais podem ser editados diretamente no arquivo `js/data.js`.