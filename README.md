# Pulse Invest

Aplicacao web para acompanhamento de carteira de investimentos pessoais, reconstruida com React + Vite e refinada com Tailwind CSS + shadcn/ui a partir da versao original em Vanilla HTML, CSS e JavaScript.

## Funcionalidades

- Login/cadastro local com e-mail e senha
- Sessao persistida em LocalStorage
- Dados de carteira isolados por usuario
- Cadastro, edicao e remocao de ativos
- Validacao de ticker conforme o tipo de ativo
- Autopreenchimento de dados de mercado quando a API responde
- Dashboard com patrimonio total, capital investido e rentabilidade
- Grafico de distribuicao da carteira por categoria com Chart.js
- Filtros por tipo e desempenho
- Painel Trader com busca de ativos, selecao multipla, periodo customizado e candle chart em Canvas
- Fallback local para manter a interface funcional quando APIs externas falham

## Stack

- React
- Vite
- React Router DOM
- Context API
- JavaScript
- Tailwind CSS
- shadcn/ui
- Chart.js
- Camada de services para APIs de mercado
- LocalStorage

## Estrutura

```txt
src/
  assets/
  components/
    charts/
    layout/
    portfolio/
    trader/
    ui/
  context/
  lib/
  pages/
  routes/
  services/
  styles/
  utils/
  App.jsx
  main.jsx
```

## Arquitetura

- `src/pages`: telas de rota da aplicacao.
- `src/components/ui`: componentes base shadcn/ui e wrappers de formulario.
- `src/components/layout`: estrutura global, cabecalho e navegacao.
- `src/components/portfolio`: componentes de dominio da carteira.
- `src/components/trader`: componentes de dominio do painel trader.
- `src/components/charts`: graficos com Chart.js e Canvas.
- `src/context`: estado compartilhado de autenticacao e carteira.
- `src/routes`: protecao de rotas privadas.
- `src/services`: integracao com APIs externas e series de mercado.
- `src/lib`: constantes, storage local e utilitarios gerais.
- `src/utils`: regras especificas de carteira e validacao de ativos.

## Rotas

| Rota | Descricao |
|---|---|
| `/` | Login e criacao de conta local |
| `/dashboard` | Dashboard da carteira, protegido por login |
| `/trader` | Painel de busca e candle chart, protegido por login |

Os arquivos `dashboard/index.html` e `trader/index.html` tambem apontam para a SPA para manter acesso direto com barra final em ambiente Vite.

## APIs de mercado

A camada `src/services/market.js` concentra as integracoes:

- BrAPI para ativos brasileiros, sem chave obrigatoria
- CoinGecko para criptomoedas, sem chave obrigatoria
- Twelve Data com `VITE_TWELVE_DATA_API_KEY`, opcional
- Alpha Vantage com `VITE_ALPHA_VANTAGE_API_KEY`, opcional

Sem chaves opcionais, a aplicacao continua funcionando com os provedores gratuitos disponiveis e fallback local.

## Variaveis de ambiente opcionais

```env
VITE_TWELVE_DATA_API_KEY=sua_chave_aqui
VITE_ALPHA_VANTAGE_API_KEY=sua_chave_aqui
```

## Como executar

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Cobertura dos criterios de avaliacao

- Arquitetura modular com separacao entre paginas, componentes de UI, componentes de dominio, contexts, services, lib e utils.
- Navegacao protegida com React Router DOM e estado de autenticacao centralizado.
- Estado de carteira organizado com Context API e persistencia isolada em LocalStorage.
- Integracao com BrAPI, CoinGecko, Twelve Data e Alpha Vantage isolada em `src/services/market.js`, com fallback local.
- Formularios controlados com `onChange`, `onSubmit`, `preventDefault()` e validacoes por tipo de ativo.
- Interface escura financeira com Tailwind CSS, shadcn/ui, estados vazios, feedback visual e responsividade.
- Historico de commits granular e issues em portugues para migracao e refinamento.

## Validacao

- Build de producao aprovado com `npm run build`.
- O projeto nao possui script de lint configurado no `package.json`; por isso lint nao foi executado.
- Rotas principais: `/`, `/dashboard` e `/trader`.
- Acesso direto a `/dashboard` e `/trader` funciona em ambiente Vite porque os HTMLs dessas pastas apontam para a SPA.

## Workflow / Kanban

### To Do

- Issues futuras que nao fazem parte desta entrega:
- #5 Area de cadastro separada do login
- #6 Area do usuario para verificar e alterar informacoes
- #7 Banco de dados low-code em JSON

### In Progress

- Nenhuma atividade em andamento

### In Review

- Pull Request de entrega final

### Done

- Planejamento da arquitetura React
- Componentes reutilizaveis definidos
- Projeto React + Vite configurado
- Rotas com React Router DOM
- Context API para autenticacao e carteira
- Service layer preservada e reutilizada
- Componentes separados
- Formularios controlados
- Telas Vanilla migradas para React
- Rotas protegidas conectadas
- Estado compartilhado organizado
- Acesso a storage e APIs centralizado
- Responsividade revisada
- Login e navegacao testados
- Cadastro, edicao e remocao de ativos testados
- Dashboard vazio e com dados testado
- Busca e selecao no Trader testadas
- Build de producao validado
- Organizacao do codigo revisada
- README atualizado
- Issue #15: Auditoria da arquitetura React e criterios de avaliacao
- Issue #16: Configuracao de Tailwind CSS e shadcn/ui
- Issue #17: Refinamento dos componentes reutilizaveis
- Issue #18: Melhoria das telas de login, dashboard e trader
- Issue #19: Revisao de README, Kanban e preparacao do Pull Request
- Alias `@/*` configurado para imports internos
- Estrutura `components/ui`, `portfolio`, `trader`, `layout` e `charts` organizada
- Componentes shadcn/ui aplicados em cards, botoes, inputs, badges, alerts e separadores
- Interface financeira escura refinada
- Responsividade revisada para desktop, tablet e celular
- Pull Request preparado em portugues
