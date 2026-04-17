export const STORAGE_KEYS = {
  users: 'pulse-invest:users',
  session: 'pulse-invest:session',
}

export const LEGACY_ASSET_TYPE_MAP = {
  'Ações BR': 'Ações',
  Stocks: 'Ações Internacionais',
  Fundos: 'Fundos de Investimento',
  'Caixa / Reserva': 'Caixa e Reserva',
}

export const ASSET_TYPE_RULES = {
  'Renda Fixa': {
    symbolPlaceholder: 'CDB-2027',
    symbolHint: 'Use um codigo interno curto para identificar o titulo ou emissor.',
    symbolPattern: /^[A-Za-z0-9./ -]{2,30}$/,
    symbolError: 'Use um codigo simples, como CDB-2027 ou LCI-ITAU.',
  },
  Ações: {
    symbolPlaceholder: 'PETR4',
    symbolHint: 'Para acoes brasileiras, use o ticker da B3, como PETR4, VALE3 ou ITUB4.',
    symbolPattern: /^[A-Z]{4,6}\d{1,2}$/,
    symbolError: 'Use um ticker da B3 no formato PETR4, VALE3 ou ITUB4.',
  },
  FIIs: {
    symbolPlaceholder: 'HGLG11',
    symbolHint: 'Para FIIs, use o ticker negociado na B3, como HGLG11 ou MXRF11.',
    symbolPattern: /^[A-Z]{4,6}\d{1,2}$/,
    symbolError: 'Use um ticker de FII no formato HGLG11 ou MXRF11.',
  },
  'Ações Internacionais': {
    symbolPlaceholder: 'AAPL',
    symbolHint: 'Use o ticker internacional, como AAPL, MSFT, GOOGL ou TSLA.',
    symbolPattern: /^[A-Z.\-]{1,10}$/,
    symbolError: 'Use um ticker internacional valido, como AAPL, MSFT ou GOOGL.',
  },
  ETFs: {
    symbolPlaceholder: 'BOVA11',
    symbolHint: 'Use o ticker do ETF, como BOVA11, IVVB11 ou SPY.',
    symbolPattern: /^[A-Z]{2,6}\d{0,2}$/,
    symbolError: 'Use um ticker de ETF valido, como BOVA11, IVVB11 ou SPY.',
  },
  BDRs: {
    symbolPlaceholder: 'AAPL34',
    symbolHint: 'Use o ticker do BDR na B3, como AAPL34, MSFT34 ou GOGL34.',
    symbolPattern: /^[A-Z]{4,6}\d{2}$/,
    symbolError: 'Use um ticker de BDR no formato AAPL34, MSFT34 ou GOGL34.',
  },
  Criptomoedas: {
    symbolPlaceholder: 'BTC',
    symbolHint: 'Use sigla ou id conhecido pelo CoinGecko, como BTC, ETH, SOL ou bitcoin.',
    symbolPattern: /^[A-Za-z0-9-]{2,20}$/,
    symbolError: 'Use uma sigla ou id valido, como BTC, ETH, SOL ou bitcoin.',
  },
  'Fundos de Investimento': {
    symbolPlaceholder: 'XPML-FIC',
    symbolHint: 'Use um codigo interno ou abreviacao do fundo para organizar sua carteira.',
    symbolPattern: /^[A-Za-z0-9./ -]{2,30}$/,
    symbolError: 'Use um codigo simples para o fundo, como XPML-FIC ou MULTI-01.',
  },
  'Tesouro Direto': {
    symbolPlaceholder: 'SELIC2029',
    symbolHint: 'Use um codigo curto para o titulo, como SELIC2029 ou IPCA2035.',
    symbolPattern: /^[A-Za-z0-9./ -]{4,30}$/,
    symbolError: 'Use um codigo como SELIC2029 ou IPCA2035.',
  },
  'Caixa e Reserva': {
    symbolPlaceholder: 'CAIXA',
    symbolHint: 'Use um identificador simples para caixa, conta ou reserva.',
    symbolPattern: /^[A-Za-z0-9./ -]{2,20}$/,
    symbolError: 'Use um identificador simples, como CAIXA ou RESERVA.',
  },
}

export const ASSET_TYPES = Object.keys(ASSET_TYPE_RULES)

export const TYPE_BADGES = {
  'Renda Fixa': 'bg-emerald-500/15 text-emerald-200',
  Ações: 'bg-sky-500/15 text-sky-200',
  FIIs: 'bg-amber-500/15 text-amber-200',
  'Ações Internacionais': 'bg-violet-500/15 text-violet-200',
  ETFs: 'bg-cyan-500/15 text-cyan-200',
  BDRs: 'bg-indigo-500/15 text-indigo-200',
  Criptomoedas: 'bg-orange-500/15 text-orange-200',
  'Fundos de Investimento': 'bg-fuchsia-500/15 text-fuchsia-200',
  'Tesouro Direto': 'bg-lime-500/15 text-lime-200',
  'Caixa e Reserva': 'bg-zinc-500/15 text-zinc-200',
}

export const CHART_COLORS = [
  '#34d399',
  '#38bdf8',
  '#f59e0b',
  '#a78bfa',
  '#22d3ee',
  '#818cf8',
  '#fb923c',
  '#e879f9',
  '#a3e635',
  '#94a3b8',
]

export const QUOTE_SOURCE_META = {
  brapi: {
    label: 'Brapi',
    badgeClass: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
    tone: 'real',
  },
  coingecko: {
    label: 'CoinGecko',
    badgeClass: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100',
    tone: 'real',
  },
  fallback: {
    label: 'Fallback local',
    badgeClass: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
    tone: 'fallback',
  },
}
