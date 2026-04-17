const TYPE_MULTIPLIERS = {
  'Renda Fixa': 1.012,
  Ações: 1.084,
  FIIs: 1.039,
  'Ações Internacionais': 1.102,
  ETFs: 1.076,
  BDRs: 1.061,
  Criptomoedas: 1.148,
  'Fundos de Investimento': 1.027,
  'Tesouro Direto': 1.019,
  'Caixa e Reserva': 1,
}

const BRAPI_TYPES = new Set(['Ações', 'FIIs', 'BDRs', 'ETFs'])
const CRYPTO_SYMBOL_ALIASES = {
  BTC: 'bitcoin',
  XBT: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  DOGE: 'dogecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  USDT: 'tether',
  USDC: 'usd-coin',
}

function seededNumber(text) {
  return [...String(text || 'SEM_CODIGO')].reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

function buildFallbackQuote(asset, reason = 'api_unavailable') {
  const averagePrice = Number(asset.averagePrice || 0)
  const baseline = averagePrice || 100
  const multiplier = TYPE_MULTIPLIERS[asset.type] || 1.025
  const seed = seededNumber(asset.symbol)
  const adjustment = ((seed % 13) - 6) / 100
  const currentPrice = Number((baseline * multiplier * (1 + adjustment / 10)).toFixed(2))
  const variation = Number((((currentPrice - baseline) / baseline) || 0).toFixed(4))

  return {
    price: currentPrice,
    variation,
    source: 'fallback',
    isFallback: true,
    reason,
    updatedAt: new Date().toISOString(),
  }
}

function normalizeBrapiSymbol(symbol) {
  return String(symbol || '').trim().toUpperCase()
}

function normalizeCoinGeckoId(symbol) {
  const cleaned = String(symbol || '').trim()
  if (!cleaned) return ''

  return CRYPTO_SYMBOL_ALIASES[cleaned.toUpperCase()] || cleaned.toLowerCase()
}

async function tryBrapiQuote(asset) {
  if (!asset.symbol || !BRAPI_TYPES.has(asset.type)) return null

  const normalizedSymbol = normalizeBrapiSymbol(asset.symbol)
  if (!normalizedSymbol) return null

  const response = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(normalizedSymbol)}`)
  if (!response.ok) return null

  const data = await response.json()
  const result = data?.results?.[0]
  if (!result?.regularMarketPrice) return null

  return {
    price: Number(result.regularMarketPrice),
    variation: Number((result.regularMarketChangePercent || 0) / 100),
    source: 'brapi',
    isFallback: false,
    providerSymbol: normalizedSymbol,
    updatedAt: new Date().toISOString(),
  }
}

async function tryCoinGeckoQuote(asset) {
  if (asset.type !== 'Criptomoedas' || !asset.symbol) return null

  const cryptoId = normalizeCoinGeckoId(asset.symbol)
  if (!cryptoId) return null

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      cryptoId,
    )}&vs_currencies=brl&include_24hr_change=true`,
  )
  if (!response.ok) return null

  const data = await response.json()
  const result = data?.[cryptoId]
  if (!result?.brl) return null

  return {
    price: Number(result.brl),
    variation: Number((result.brl_24h_change || 0) / 100),
    source: 'coingecko',
    isFallback: false,
    providerSymbol: cryptoId,
    updatedAt: new Date().toISOString(),
  }
}

async function fetchRealQuote(asset) {
  const providers = asset.type === 'Criptomoedas' ? [tryCoinGeckoQuote] : [tryBrapiQuote]

  for (const provider of providers) {
    const quote = await provider(asset)
    if (quote) return quote
  }

  return null
}

export async function fetchAssetQuote(asset) {
  try {
    const realQuote = await fetchRealQuote(asset)
    if (realQuote) return realQuote
    return buildFallbackQuote(asset, 'symbol_not_found')
  } catch {
    return buildFallbackQuote(asset, 'request_failed')
  }
}
