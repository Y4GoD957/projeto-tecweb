# Portfólio Financeiro

Aplicação web de gerenciamento de portfólio de investimentos com painel de análise de mercado em tempo real. Construída com JavaScript puro, sem frameworks, com foco em performance e experiência do usuário.

---

## Funcionalidades

### Autenticação
- Cadastro e login com email e senha
- Sessão persistente via LocalStorage
- Isolamento completo de dados por usuário

### Dashboard — Portfólio
- **Resumo patrimonial** com três métricas principais: patrimônio total, capital investido e rentabilidade
- **Cadastro de ativos** com preenchimento automático via APIs de mercado ao informar o ticker
- **Cálculo bidirecional** entre quantidade, preço e valor de mercado
- **Gráfico de alocação** (doughnut) por tipo de ativo com legenda interativa via Chart.js
- **Listagem de ativos** com valor atual, variação percentual e fonte da cotação
- **Filtros** por tipo de ativo e por desempenho (positivo, negativo, neutro)
- Edição e remoção de ativos com atualização em tempo real

### Trader — Análise de Mercado
- **Busca de ativos** por ticker ou nome, com suporte a múltiplos tipos
- **Seleção múltipla** para comparação de ativos
- **Seleção de período** com presets (1D, 1S, 1M, 3M) e intervalo personalizado
- **Gráfico de candlestick** customizado em Canvas com dados OHLC (abertura, máxima, mínima, fechamento)
- **Cache local** de séries históricas para evitar chamadas repetidas às APIs

### Tipos de Ativos Suportados
| Tipo | Exemplo |
|---|---|
| Ações (B3) | PETR4, VALE3 |
| FIIs | HGLG11, XPML11 |
| ETFs | BOVA11, IVVB11 |
| BDRs | AAPL34, MSFT34 |
| Ações Internacionais | AAPL, TSLA |
| Criptomoedas | BTC, ETH |
| Renda Fixa | CDB-2027 |
| Tesouro Direto | SELIC2029 |
| Fundos de Investimento | XPML-FIC |
| Caixa e Reserva | CAIXA |

---

## Integrações de Mercado

A aplicação utiliza **quatro provedores** de dados com fallback automático entre eles:

| Provedor | Dados | Chave de API |
|---|---|---|
| [BrAPI](https://brapi.dev) | Ações BR, FIIs, BDRs, ETFs | Não necessária |
| [Twelve Data](https://twelvedata.com) | Ações BR e internacionais | Opcional (`VITE_TWELVE_DATA_API_KEY`) |
| [Alpha Vantage](https://alphavantage.co) | Ações BR e internacionais | Opcional (`VITE_ALPHA_VANTAGE_API_KEY`) |
| [CoinGecko](https://coingecko.com) | Criptomoedas | Não necessária |

**Lógica de fallback por tipo de ativo:**
- Ações BR: BrAPI → Twelve Data → Alpha Vantage
- Ações Internacionais: Twelve Data → Alpha Vantage
- Criptomoedas: CoinGecko

---

## Stack Tecnológica

| Ferramenta | Versão | Finalidade |
|---|---|---|
| [Vite](https://vitejs.dev) | ^8.0.4 | Build tool e servidor de desenvolvimento |
| [Tailwind CSS](https://tailwindcss.com) | ^4.2.2 | Estilização utilitária |
| [Chart.js](https://chartjs.org) | ^4.5.1 | Gráfico de alocação (doughnut) |
| JavaScript (ESM) | Vanilla | Lógica de negócio sem frameworks |
| LocalStorage | — | Persistência de dados no navegador |

**Fontes:** Manrope (UI) · IBM Plex Mono (código/tickers)

---

## Estrutura do Projeto

```
projeto-tecweb/
├── src/
│   ├── main.js              # Ponto de entrada
│   ├── app.js               # Estado global, eventos e orquestração
│   ├── style.css            # Estilos globais com Tailwind
│   ├── lib/
│   │   ├── constants.js     # Tipos de ativos, cores e regras de validação
│   │   ├── storage.js       # Operações de leitura/escrita no LocalStorage
│   │   └── utils.js         # Formatadores e utilitários
│   ├── services/
│   │   └── market.js        # Integração com APIs de mercado
│   └── ui/
│       └── components.js    # Funções de renderização HTML
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── index.html
├── vite.config.js
└── package.json
```

---

## Instalação e Uso

### Pré-requisitos
- Node.js 18+
- npm ou pnpm

### Instalação

```bash
git clone https://github.com/Y4GoD957/projeto-tecweb.git
cd projeto-tecweb
npm install
```

### Variáveis de Ambiente (opcionais)

Crie um arquivo `.env` na raiz do projeto para habilitar provedores adicionais:

```env
VITE_TWELVE_DATA_API_KEY=sua_chave_aqui
VITE_ALPHA_VANTAGE_API_KEY=sua_chave_aqui
```

Sem as chaves, a aplicação funciona normalmente usando BrAPI e CoinGecko.

### Desenvolvimento

```bash
npm run dev
```

### Build para produção

```bash
npm run build
npm run preview
```

---

## Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento com HMR |
| `npm run build` | Gera o build otimizado em `/dist` |
| `npm run preview` | Serve o build de produção localmente |

---

## Licença

Distribuído sob a licença MIT.
