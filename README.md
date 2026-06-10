# Pulse Invest

Aplicacao web para acompanhamento de carteira de investimentos pessoais, reconstruida com React + Vite a partir da versao original em Vanilla HTML, CSS e JavaScript.

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
- JavaScript
- Tailwind CSS via CSS global
- Chart.js
- LocalStorage

## Estrutura

```txt
src/
  components/
    Button/
    Card/
    Charts/
    Input/
    Layout/
    Navbar/
  context/
  hooks/
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
- `src/components`: componentes reutilizaveis de UI, layout e graficos.
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

## Workflow / Kanban

### To Do

- Revisar criterios da atividade

### In Progress

- Nenhuma atividade em andamento

### In Review

- Validar criterios finais da atividade

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
