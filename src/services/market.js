const TWELVE_DATA_API_KEY = import.meta.env.VITE_TWELVE_DATA_API_KEY || ''
const ALPHA_VANTAGE_API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || ''

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

const BRAZIL_LISTED_TYPES = new Set(['Ações', 'FIIs', 'BDRs', 'ETFs'])
const INTERNATIONAL_LISTED_TYPES = new Set(['Ações Internacionais'])
const LOOKUP_ONLY_TYPES = new Set([
  'Ações',
  'FIIs',
  'BDRs',
  'ETFs',
  'Criptomoedas',
  'Ações Internacionais',
])
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
  const averagePrice = Number(asset.averagePrice || asset.currentPrice || 0)
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

function normalizeCoinGeckoId(symbol) {
  const cleaned = String(symbol || '').trim()
  if (!cleaned) return ''
  return CRYPTO_SYMBOL_ALIASES[cleaned.toUpperCase()] || cleaned.toLowerCase()
}

function normalizeBrazilSymbol(symbol) {
  const normalized = String(symbol || '').trim().toUpperCase()
  if (!normalized) return ''
  return normalized.replace(/\.SA$/, '')
}

function withBrazilSuffix(symbol) {
  const normalized = normalizeBrazilSymbol(symbol)
  return normalized ? `${normalized}.SA` : ''
}

function buildBrapiSnapshot(result, selectedType) {
  const symbol = normalizeBrazilSymbol(result?.symbol || result?.stock)
  if (!symbol) return null

  return {
    symbol,
    name: result?.shortName || result?.longName || result?.name || symbol,
    type: selectedType,
    currentPrice: Number(result?.regularMarketPrice || 0),
    source: 'brapi',
    isFallback: false,
    updatedAt: new Date().toISOString(),
  }
}

function buildTwelveSnapshot(result, selectedType) {
  const symbol = BRAZIL_LISTED_TYPES.has(selectedType)
    ? normalizeBrazilSymbol(result?.symbol)
    : String(result?.symbol || '').toUpperCase()
  if (!symbol) return null

  return {
    symbol,
    name: result?.name || result?.symbol || symbol,
    type: selectedType,
    currentPrice: Number(result?.close || result?.price || 0),
    source: 'twelvedata',
    isFallback: false,
    updatedAt: new Date().toISOString(),
  }
}

function buildAlphaSnapshot(result, selectedType, fallbackSymbol = '') {
  const rawSymbol =
    result?.['01. symbol'] ||
    result?.symbol ||
    result?.['1. symbol'] ||
    result?.['8. currency'] ||
    fallbackSymbol

  const symbol = BRAZIL_LISTED_TYPES.has(selectedType)
    ? normalizeBrazilSymbol(rawSymbol)
    : String(rawSymbol || '').toUpperCase()
  if (!symbol) return null

  const price =
    Number(result?.['05. price'] || result?.['08. previous close'] || result?.price || 0) || 0

  return {
    symbol,
    name:
      result?.name ||
      result?.['2. name'] ||
      result?.['01. symbol'] ||
      result?.symbol ||
      symbol,
    type: selectedType,
    currentPrice: price,
    source: 'alphavantage',
    isFallback: false,
    updatedAt: new Date().toISOString(),
  }
}

function buildCoinGeckoSnapshot(coin, marketData) {
  const fallbackSymbol = String(coin?.symbol || '').toUpperCase()
  const symbol = fallbackSymbol || String(marketData?.symbol || '').toUpperCase()
  if (!symbol) return null

  return {
    symbol,
    name: coin?.name || marketData?.name || symbol,
    type: 'Criptomoedas',
    currentPrice: Number(marketData?.market_data?.current_price?.brl || 0),
    source: 'coingecko',
    isFallback: false,
    providerId: coin?.id || null,
    updatedAt: new Date().toISOString(),
  }
}

async function tryBrapiQuote(asset) {
  if (!BRAZIL_LISTED_TYPES.has(asset.type) || !asset.symbol) return null

  const symbol = normalizeBrazilSymbol(asset.symbol)
  if (!symbol) return null

  const response = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(symbol)}`)
  if (!response.ok) return null

  const data = await response.json()
  const result = data?.results?.[0]
  if (!result?.regularMarketPrice) return null

  return {
    price: Number(result.regularMarketPrice),
    variation: Number((result.regularMarketChangePercent || 0) / 100),
    source: 'brapi',
    isFallback: false,
    providerSymbol: symbol,
    updatedAt: new Date().toISOString(),
  }
}

async function tryTwelveQuote(asset) {
  if (!TWELVE_DATA_API_KEY) return null
  if (!asset.symbol || !(BRAZIL_LISTED_TYPES.has(asset.type) || INTERNATIONAL_LISTED_TYPES.has(asset.type))) {
    return null
  }

  const symbol = BRAZIL_LISTED_TYPES.has(asset.type)
    ? withBrazilSuffix(asset.symbol)
    : String(asset.symbol || '').trim().toUpperCase()

  const response = await fetch(
    `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(
      symbol,
    )}&apikey=${encodeURIComponent(TWELVE_DATA_API_KEY)}`,
  )
  if (!response.ok) return null

  const data = await response.json()
  if (data?.status === 'error' || !data?.close) return null

  const currentPrice = Number(data.close)
  const previousClose = Number(data.previous_close || 0)
  const variation =
    previousClose !== 0 ? Number(((currentPrice - previousClose) / previousClose).toFixed(4)) : 0

  return {
    price: currentPrice,
    variation,
    source: 'twelvedata',
    isFallback: false,
    providerSymbol: symbol,
    updatedAt: new Date().toISOString(),
  }
}

async function tryAlphaQuote(asset) {
  if (!ALPHA_VANTAGE_API_KEY) return null
  if (!asset.symbol || !(BRAZIL_LISTED_TYPES.has(asset.type) || INTERNATIONAL_LISTED_TYPES.has(asset.type))) {
    return null
  }

  const symbol = BRAZIL_LISTED_TYPES.has(asset.type)
    ? withBrazilSuffix(asset.symbol)
    : String(asset.symbol || '').trim().toUpperCase()

  const response = await fetch(
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
      symbol,
    )}&apikey=${encodeURIComponent(ALPHA_VANTAGE_API_KEY)}`,
  )
  if (!response.ok) return null

  const data = await response.json()
  const quote = data?.['Global Quote']
  if (!quote?.['05. price']) return null

  const price = Number(quote['05. price'])
  const previousClose = Number(quote['08. previous close'] || 0)
  const variation =
    previousClose !== 0 ? Number(((price - previousClose) / previousClose).toFixed(4)) : 0

  return {
    price,
    variation,
    source: 'alphavantage',
    isFallback: false,
    providerSymbol: symbol,
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
  const providers =
    asset.type === 'Criptomoedas'
      ? [tryCoinGeckoQuote]
      : BRAZIL_LISTED_TYPES.has(asset.type)
        ? [tryBrapiQuote, tryTwelveQuote, tryAlphaQuote]
        : INTERNATIONAL_LISTED_TYPES.has(asset.type)
          ? [tryTwelveQuote, tryAlphaQuote]
          : []

  for (const provider of providers) {
    const quote = await provider(asset)
    if (quote) return quote
  }

  return null
}

async function searchBrapiBySymbol(symbol, selectedType) {
  const normalized = normalizeBrazilSymbol(symbol)
  if (!normalized) return null

  const response = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(normalized)}`)
  if (!response.ok) return null

  const data = await response.json()
  return buildBrapiSnapshot(data?.results?.[0], selectedType)
}

async function searchBrapiByName(query, selectedType) {
  const normalized = String(query || '').trim()
  if (!normalized) return null

  const response = await fetch(
    `https://brapi.dev/api/quote/list?search=${encodeURIComponent(normalized)}`,
  )
  if (!response.ok) return null

  const data = await response.json()
  const result = data?.stocks?.[0]
  return buildBrapiSnapshot(result, selectedType)
}

async function searchTwelveBySymbol(symbol, selectedType) {
  if (!TWELVE_DATA_API_KEY) return null

  const providerSymbol = BRAZIL_LISTED_TYPES.has(selectedType)
    ? withBrazilSuffix(symbol)
    : String(symbol || '').trim().toUpperCase()
  if (!providerSymbol) return null

  const response = await fetch(
    `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(
      providerSymbol,
    )}&apikey=${encodeURIComponent(TWELVE_DATA_API_KEY)}`,
  )
  if (!response.ok) return null

  const data = await response.json()
  if (data?.status === 'error') return null
  return buildTwelveSnapshot(data, selectedType)
}

async function searchTwelveByName(query, selectedType) {
  if (!TWELVE_DATA_API_KEY) return null

  const normalized = String(query || '').trim()
  if (!normalized) return null

  const response = await fetch(
    `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(
      normalized,
    )}&apikey=${encodeURIComponent(TWELVE_DATA_API_KEY)}`,
  )
  if (!response.ok) return null

  const data = await response.json()
  const list = Array.isArray(data?.data) ? data.data : []
  const match =
    list.find((item) => {
      if (!item?.symbol) return false
      if (BRAZIL_LISTED_TYPES.has(selectedType)) return item.country === 'Brazil'
      return item.country !== 'Brazil'
    }) || list[0]

  return buildTwelveSnapshot(match, selectedType)
}

async function searchAlphaBySymbol(symbol, selectedType) {
  if (!ALPHA_VANTAGE_API_KEY) return null

  const providerSymbol = BRAZIL_LISTED_TYPES.has(selectedType)
    ? withBrazilSuffix(symbol)
    : String(symbol || '').trim().toUpperCase()
  if (!providerSymbol) return null

  const response = await fetch(
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
      providerSymbol,
    )}&apikey=${encodeURIComponent(ALPHA_VANTAGE_API_KEY)}`,
  )
  if (!response.ok) return null

  const data = await response.json()
  return buildAlphaSnapshot(data?.['Global Quote'], selectedType, providerSymbol)
}

async function searchAlphaByName(query, selectedType) {
  if (!ALPHA_VANTAGE_API_KEY) return null

  const normalized = String(query || '').trim()
  if (!normalized) return null

  const response = await fetch(
    `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(
      normalized,
    )}&apikey=${encodeURIComponent(ALPHA_VANTAGE_API_KEY)}`,
  )
  if (!response.ok) return null

  const data = await response.json()
  const matches = Array.isArray(data?.bestMatches) ? data.bestMatches : []
  const match =
    matches.find((item) => {
      const region = item?.['4. region'] || ''
      if (BRAZIL_LISTED_TYPES.has(selectedType)) return region.includes('Brazil')
      return !region.includes('Brazil')
    }) || matches[0]

  return buildAlphaSnapshot(match, selectedType)
}

async function searchCoinGeckoBySymbolOrId(symbol) {
  const normalizedId = normalizeCoinGeckoId(symbol)
  if (!normalizedId) return null

  const searchResponse = await fetch(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(normalizedId)}`,
  )
  if (!searchResponse.ok) return null

  const searchData = await searchResponse.json()
  const coin =
    searchData?.coins?.find(
      (item) =>
        item.id?.toLowerCase() === normalizedId.toLowerCase() ||
        item.symbol?.toLowerCase() === String(symbol || '').toLowerCase(),
    ) || searchData?.coins?.[0]
  if (!coin?.id) return null

  const detailResponse = await fetch(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
      coin.id,
    )}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`,
  )
  if (!detailResponse.ok) return null

  const detailData = await detailResponse.json()
  return buildCoinGeckoSnapshot(coin, detailData)
}

async function searchCoinGeckoByName(query) {
  return searchCoinGeckoBySymbolOrId(query)
}

export async function resolveAssetDetails({ symbol = '', name = '', type = '' }) {
  const normalizedSymbol = String(symbol || '').trim()
  const normalizedName = String(name || '').trim()
  const normalizedType = String(type || '').trim()

  if (!LOOKUP_ONLY_TYPES.has(normalizedType)) return null

  try {
    if (normalizedType === 'Criptomoedas') {
      if (normalizedSymbol) {
        const cryptoBySymbol = await searchCoinGeckoBySymbolOrId(normalizedSymbol)
        if (cryptoBySymbol) return cryptoBySymbol
      }
      if (normalizedName) {
        const cryptoByName = await searchCoinGeckoByName(normalizedName)
        if (cryptoByName) return cryptoByName
      }
      return null
    }

    const searchBySymbol = BRAZIL_LISTED_TYPES.has(normalizedType)
      ? [searchBrapiBySymbol, searchTwelveBySymbol, searchAlphaBySymbol]
      : [searchTwelveBySymbol, searchAlphaBySymbol]

    const searchByName = BRAZIL_LISTED_TYPES.has(normalizedType)
      ? [searchBrapiByName, searchTwelveByName, searchAlphaByName]
      : [searchTwelveByName, searchAlphaByName]

    if (normalizedSymbol) {
      for (const provider of searchBySymbol) {
        const result = await provider(normalizedSymbol, normalizedType)
        if (result) return result
      }
    }

    if (normalizedName) {
      for (const provider of searchByName) {
        const result = await provider(normalizedName, normalizedType)
        if (result) return result
      }
    }
  } catch {
    return null
  }

  return null
}

export async function fetchAssetQuote(asset) {
  if (asset.quoteMode === 'manual') {
    return {
      price: Number(asset.currentPrice || 0),
      variation: Number(asset.manualVariation || 0),
      source: 'manual',
      isFallback: false,
      updatedAt: asset.manualUpdatedAt || new Date().toISOString(),
    }
  }

  try {
    const realQuote = await fetchRealQuote(asset)
    if (realQuote) return realQuote
    return buildFallbackQuote(asset, 'symbol_not_found')
  } catch {
    return buildFallbackQuote(asset, 'request_failed')
  }
}
