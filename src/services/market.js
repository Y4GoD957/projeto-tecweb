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
const TRADER_SERIES_CACHE_KEY = 'pulse-invest:trader-series-cache'

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

function getTraderSeriesCacheKey(asset) {
  return JSON.stringify({
    symbol: String(asset.symbol || '').toUpperCase(),
    type: asset.type,
    providerId: asset.providerId || null,
    dateFrom: asset.dateFrom || '',
    dateTo: asset.dateTo || '',
  })
}

function readTraderSeriesCache() {
  try {
    const raw = globalThis.localStorage?.getItem(TRADER_SERIES_CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeTraderSeriesCache(cache) {
  try {
    globalThis.localStorage?.setItem(TRADER_SERIES_CACHE_KEY, JSON.stringify(cache))
  } catch {
    return
  }
}

function getCachedTraderSeries(asset) {
  const cache = readTraderSeriesCache()
  const cached = cache[getTraderSeriesCacheKey(asset)]
  if (!cached?.candles?.length) return null

  return {
    ...cached,
    fromCache: true,
    candles: cached.candles.map((item) => ({
      ...item,
      timestamp: item.timestamp ? new Date(item.timestamp) : null,
    })),
  }
}

function setCachedTraderSeries(asset, series) {
  if (!series?.candles?.length) return

  const cache = readTraderSeriesCache()
  cache[getTraderSeriesCacheKey(asset)] = {
    ...series,
    candles: series.candles.map((item) => ({
      ...item,
      timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : null,
    })),
  }
  writeTraderSeriesCache(cache)
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

function buildTraderSearchResult({ symbol, name, type, source, providerId = null, currentPrice = 0, variation = 0 }) {
  const normalizedSymbol =
    type === 'Criptomoedas' ? String(symbol || '').toUpperCase() : normalizeBrazilSymbol(symbol) || String(symbol || '').toUpperCase()

  if (!normalizedSymbol || !name || !type) return null

  return {
    id: `${type}:${normalizedSymbol}:${providerId || source}`,
    symbol: normalizedSymbol,
    name,
    type,
    source,
    providerId,
    currentPrice: Number(currentPrice || 0),
    variation: Number(variation || 0),
  }
}

function uniqueTraderResults(items) {
  const map = new Map()
  items.filter(Boolean).forEach((item) => {
    const key = `${item.type}:${item.symbol}`
    if (!map.has(key)) {
      map.set(key, item)
    }
  })
  return [...map.values()]
}

async function searchBrapiMarketAssets(query, selectedType) {
  if (!BRAZIL_LISTED_TYPES.has(selectedType)) return []

  const normalized = String(query || '').trim()
  if (!normalized) return []

  const response = await fetch(
    `https://brapi.dev/api/quote/list?search=${encodeURIComponent(normalized)}`,
  )
  if (!response.ok) return []

  const data = await response.json()
  const list = Array.isArray(data?.stocks) ? data.stocks : []

  return list.slice(0, 8).map((result) =>
    buildTraderSearchResult({
      symbol: result?.stock || result?.symbol,
      name: result?.name || result?.shortName || result?.longName || result?.stock,
      type: selectedType,
      source: 'brapi',
      currentPrice: Number(result?.close || result?.regularMarketPrice || 0),
    }),
  )
}

async function searchTwelveMarketAssets(query, selectedType) {
  if (!TWELVE_DATA_API_KEY) return []
  if (!(BRAZIL_LISTED_TYPES.has(selectedType) || INTERNATIONAL_LISTED_TYPES.has(selectedType))) {
    return []
  }

  const normalized = String(query || '').trim()
  if (!normalized) return []

  const response = await fetch(
    `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(
      normalized,
    )}&apikey=${encodeURIComponent(TWELVE_DATA_API_KEY)}`,
  )
  if (!response.ok) return []

  const data = await response.json()
  const list = Array.isArray(data?.data) ? data.data : []
  const filtered = list.filter((item) => {
    if (!item?.symbol) return false
    if (BRAZIL_LISTED_TYPES.has(selectedType)) return item.country === 'Brazil'
    return item.country !== 'Brazil'
  })

  return filtered.slice(0, 8).map((item) =>
    buildTraderSearchResult({
      symbol: item?.symbol,
      name: item?.instrument_name || item?.name || item?.symbol,
      type: selectedType,
      source: 'twelvedata',
    }),
  )
}

async function searchAlphaMarketAssets(query, selectedType) {
  if (!ALPHA_VANTAGE_API_KEY) return []
  if (!(BRAZIL_LISTED_TYPES.has(selectedType) || INTERNATIONAL_LISTED_TYPES.has(selectedType))) {
    return []
  }

  const normalized = String(query || '').trim()
  if (!normalized) return []

  const response = await fetch(
    `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(
      normalized,
    )}&apikey=${encodeURIComponent(ALPHA_VANTAGE_API_KEY)}`,
  )
  if (!response.ok) return []

  const data = await response.json()
  const matches = Array.isArray(data?.bestMatches) ? data.bestMatches : []
  const filtered = matches.filter((item) => {
    const region = item?.['4. region'] || ''
    if (BRAZIL_LISTED_TYPES.has(selectedType)) return region.includes('Brazil')
    return !region.includes('Brazil')
  })

  return filtered.slice(0, 8).map((item) =>
    buildTraderSearchResult({
      symbol: item?.['1. symbol'],
      name: item?.['2. name'] || item?.['1. symbol'],
      type: selectedType,
      source: 'alphavantage',
    }),
  )
}

async function searchCoinGeckoMarketAssets(query) {
  const normalized = String(query || '').trim()
  if (!normalized) return []

  const response = await fetch(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(normalized)}`,
  )
  if (!response.ok) return []

  const data = await response.json()
  const list = Array.isArray(data?.coins) ? data.coins : []

  return list.slice(0, 8).map((coin) =>
    buildTraderSearchResult({
      symbol: coin?.symbol,
      name: coin?.name || coin?.symbol,
      type: 'Criptomoedas',
      source: 'coingecko',
      providerId: coin?.id || null,
      currentPrice: Number(coin?.market_cap_rank || 0) ? 0 : 0,
    }),
  )
}

export async function searchTraderAssets({ query = '', type = '' }) {
  const normalizedQuery = String(query || '').trim()
  const normalizedType = String(type || '').trim()

  if (!normalizedQuery || !LOOKUP_ONLY_TYPES.has(normalizedType)) return []

  try {
    if (normalizedType === 'Criptomoedas') {
      return uniqueTraderResults(await searchCoinGeckoMarketAssets(normalizedQuery))
    }

    if (BRAZIL_LISTED_TYPES.has(normalizedType)) {
      return uniqueTraderResults([
        ...(await searchBrapiMarketAssets(normalizedQuery, normalizedType)),
        ...(await searchTwelveMarketAssets(normalizedQuery, normalizedType)),
        ...(await searchAlphaMarketAssets(normalizedQuery, normalizedType)),
      ])
    }

    if (INTERNATIONAL_LISTED_TYPES.has(normalizedType)) {
      return uniqueTraderResults([
        ...(await searchTwelveMarketAssets(normalizedQuery, normalizedType)),
        ...(await searchAlphaMarketAssets(normalizedQuery, normalizedType)),
      ])
    }
  } catch {
    return []
  }

  return []
}

function buildSeriesFallback(asset) {
  const lastPrice = Number(asset.currentPrice || 0)
  const variation = Number(asset.variation || 0)
  const labels = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`)
  const seed = seededNumber(asset.symbol)
  const points = labels.map((_, index) => {
    const progress = index / Math.max(labels.length - 1, 1)
    const trend = -variation * (1 - progress)
    const wave = Math.sin(progress * Math.PI * 3 + seed / 13) * Math.max(Math.abs(variation), 0.01) * 0.35
    return Number(Math.max(lastPrice * (1 + trend + wave), 0.0001).toFixed(2))
  })
  const candles = points.map((close, index) => {
    const open = Number(points[Math.max(index - 1, 0)] || close)
    const spread = Math.max(close * 0.006, 0.01)
    const high = Math.max(open, close) + spread
    const low = Math.max(Math.min(open, close) - spread, 0.0001)
    return {
      label: labels[index],
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    }
  })

  return {
    labels,
    points,
    candles,
    source: 'fallback',
    updatedAt: new Date().toISOString(),
    isFallback: true,
  }
}

function aggregateCandlesByPeriod(candles, days) {
  if (!Array.isArray(candles) || !candles.length || days <= 45) return candles

  const grouped = new Map()
  candles.forEach((item) => {
    const time = item.timestamp instanceof Date && !Number.isNaN(item.timestamp.getTime()) ? item.timestamp : null
    const key = time ? time.toISOString().slice(0, 10) : item.label
    const current = grouped.get(key)

    if (!current) {
      grouped.set(key, { ...item })
      return
    }

    grouped.set(key, {
      ...current,
      high: Math.max(current.high, item.high),
      low: Math.min(current.low, item.low),
      close: item.close,
      label: time ? formatTraderLabel(time, days) : current.label,
      timestamp: current.timestamp || time,
    })
  })

  return [...grouped.values()]
}

function buildSeriesResult(candles, source, updatedAt, isFallback = false, days = 1) {
  if (!Array.isArray(candles) || !candles.length) return null

  const normalizedCandles = aggregateCandlesByPeriod(candles, days)
    .map((item, index) => ({
      label: item?.label || `P${index + 1}`,
      open: Number(item?.open || 0),
      high: Number(item?.high || 0),
      low: Number(item?.low || 0),
      close: Number(item?.close || 0),
      timestamp: item?.timestamp instanceof Date ? item.timestamp : null,
    }))
    .filter(
      (item) =>
        item.open > 0 &&
        item.high > 0 &&
        item.low > 0 &&
        item.close > 0 &&
        item.high >= Math.max(item.open, item.close) &&
        item.low <= Math.min(item.open, item.close),
    )

  if (!normalizedCandles.length) return null

  return {
    labels: normalizedCandles.map((item) => item.label),
    points: normalizedCandles.map((item) => Number(item.close.toFixed(2))),
    candles: normalizedCandles.map((item) => ({
      ...item,
      open: Number(item.open.toFixed(2)),
      high: Number(item.high.toFixed(2)),
      low: Number(item.low.toFixed(2)),
      close: Number(item.close.toFixed(2)),
      timestamp: item.timestamp,
    })),
    source,
    updatedAt: updatedAt || new Date().toISOString(),
    isFallback,
  }
}

function getTraderRangeOptions(dateFrom, dateTo) {
  const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
  const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null

  if (!from || Number.isNaN(from.getTime()) || !to || Number.isNaN(to.getTime()) || from > to) {
    return {
      from: null,
      to: null,
      days: 1,
      interval: '1h',
      outputSize: 24,
    }
  }

  const days = Math.max(Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)), 1)
  return {
    from,
    to,
    days,
    interval: days <= 2 ? '1h' : days <= 45 ? '4h' : '1day',
    outputSize: Math.min(days <= 2 ? days * 24 : days <= 45 ? days * 6 : days + 10, 5000),
  }
}

function formatTraderLabel(date, days) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''

  if (days <= 2) {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}

function filterCandlesByDate(candles, from, to) {
  if (!from || !to) return candles
  return candles.filter((item) => {
    const time = item.timestamp instanceof Date ? item.timestamp : null
    if (!time || Number.isNaN(time.getTime())) return true
    return time >= from && time <= to
  })
}

async function fetchBrapiSeries(asset) {
  if (!BRAZIL_LISTED_TYPES.has(asset.type)) return null

  const symbol = normalizeBrazilSymbol(asset.symbol)
  if (!symbol) return null

  const rangeOptions = getTraderRangeOptions(asset.dateFrom, asset.dateTo)
  const response = await fetch(
    `https://brapi.dev/api/quote/${encodeURIComponent(symbol)}?range=${Math.max(
      rangeOptions.days,
      1,
    )}d&interval=${rangeOptions.days <= 7 ? '1h' : '1d'}`,
  )
  if (!response.ok) return null

  const data = await response.json()
  const result = data?.results?.[0]
  const prices =
    result?.historicalDataPrice?.prices ||
    result?.historicalDataPrice ||
    result?.prices ||
    []

  if (!Array.isArray(prices) || !prices.length) return null

  const { from, to, days } = rangeOptions
  const candles = prices.map((item, index) => {
    const rawTime = item?.date || item?.datetime || item?.timestamp
    let label = `P${index + 1}`
    let timestamp = null
    if (rawTime) {
      const date = new Date(typeof rawTime === 'number' ? rawTime * 1000 : rawTime)
      if (!Number.isNaN(date.getTime())) {
        timestamp = date
        label = formatTraderLabel(date, days)
      }
    }
    const close = Number(item?.close ?? item?.value ?? item?.price ?? 0)
    const open = Number(item?.open ?? close)
    const high = Number(item?.high ?? Math.max(open, close))
    const low = Number(item?.low ?? Math.min(open, close))
    return { label, open, high, low, close, timestamp }
  })

  return buildSeriesResult(
    filterCandlesByDate(candles, from, to),
    'brapi',
    new Date().toISOString(),
    false,
    days,
  )
}

async function fetchTwelveSeries(asset) {
  if (!TWELVE_DATA_API_KEY) return null
  if (!(BRAZIL_LISTED_TYPES.has(asset.type) || INTERNATIONAL_LISTED_TYPES.has(asset.type))) return null

  const symbol = BRAZIL_LISTED_TYPES.has(asset.type)
    ? withBrazilSuffix(asset.symbol)
    : String(asset.symbol || '').trim().toUpperCase()

  if (!symbol) return null

  const range = getTraderRangeOptions(asset.dateFrom, asset.dateTo)
  const response = await fetch(
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
      symbol,
    )}&interval=${range.interval}&outputsize=${range.outputSize}&apikey=${encodeURIComponent(
      TWELVE_DATA_API_KEY,
    )}`,
  )
  if (!response.ok) return null

  const data = await response.json()
  const values = Array.isArray(data?.values) ? [...data.values].reverse() : []
  if (!values.length) return null

  const candles = values.map((item, index) => {
    const date = new Date(item?.datetime)
    let label = `P${index + 1}`
    let timestamp = null
    if (!Number.isNaN(date.getTime())) {
      timestamp = date
      label = formatTraderLabel(date, range.days)
    }
    return {
      label,
      open: Number(item?.open || 0),
      high: Number(item?.high || 0),
      low: Number(item?.low || 0),
      close: Number(item?.close || 0),
      timestamp,
    }
  })

  return buildSeriesResult(
    filterCandlesByDate(candles, range.from, range.to),
    'twelvedata',
    new Date().toISOString(),
    false,
    range.days,
  )
}

async function fetchAlphaSeries(asset) {
  if (!ALPHA_VANTAGE_API_KEY) return null
  if (!(BRAZIL_LISTED_TYPES.has(asset.type) || INTERNATIONAL_LISTED_TYPES.has(asset.type))) return null

  const symbol = BRAZIL_LISTED_TYPES.has(asset.type)
    ? withBrazilSuffix(asset.symbol)
    : String(asset.symbol || '').trim().toUpperCase()

  if (!symbol) return null

  const range = getTraderRangeOptions(asset.dateFrom, asset.dateTo)
  if (range.days > 7) {
    const dailyResponse = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(
        symbol,
      )}&outputsize=${range.days > 90 ? 'full' : 'compact'}&apikey=${encodeURIComponent(
        ALPHA_VANTAGE_API_KEY,
      )}`,
    )
    if (!dailyResponse.ok) return null

    const dailyData = await dailyResponse.json()
    const dailySeries = dailyData?.['Time Series (Daily)']
    if (!dailySeries || typeof dailySeries !== 'object') return null

    const entries = Object.entries(dailySeries).reverse().slice(-Math.min(range.days + 10, 365))
    if (!entries.length) return null

    const candles = entries.map(([rawLabel, point], index) => {
      const date = new Date(rawLabel)
      let label = `P${index + 1}`
      let timestamp = null
      if (!Number.isNaN(date.getTime())) {
        timestamp = date
        label = formatTraderLabel(date, range.days)
      }
      return {
        label,
        open: Number(point?.['1. open'] || 0),
        high: Number(point?.['2. high'] || 0),
        low: Number(point?.['3. low'] || 0),
        close: Number(point?.['4. close'] || 0),
        timestamp,
      }
    })

    return buildSeriesResult(
      filterCandlesByDate(candles, range.from, range.to),
      'alphavantage',
      new Date().toISOString(),
      false,
      range.days,
    )
  }

  const response = await fetch(
    `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(
      symbol,
    )}&interval=${range.interval === '1day' ? '60min' : '60min'}&outputsize=${
      range.days > 30 ? 'full' : 'compact'
    }&apikey=${encodeURIComponent(ALPHA_VANTAGE_API_KEY)}`,
  )
  if (!response.ok) return null

  const data = await response.json()
  const series = data?.['Time Series (60min)']
  if (!series || typeof series !== 'object') return null

  const targetPoints = Math.min(range.days <= 2 ? 48 : range.days + 10, 500)
  const entries = Object.entries(series).reverse().slice(-targetPoints)
  if (!entries.length) return null

  const candles = entries.map(([rawLabel, point], index) => {
    const date = new Date(rawLabel)
    let label = `P${index + 1}`
    let timestamp = null
    if (!Number.isNaN(date.getTime())) {
      timestamp = date
      label = formatTraderLabel(date, range.days)
    }
    return {
      label,
      open: Number(point?.['1. open'] || 0),
      high: Number(point?.['2. high'] || 0),
      low: Number(point?.['3. low'] || 0),
      close: Number(point?.['4. close'] || 0),
      timestamp,
    }
  })

  return buildSeriesResult(
    filterCandlesByDate(candles, range.from, range.to),
    'alphavantage',
    new Date().toISOString(),
    false,
    range.days,
  )
}

async function fetchCoinGeckoSeries(asset) {
  if (asset.type !== 'Criptomoedas') return null

  const providerId = asset.providerId || normalizeCoinGeckoId(asset.symbol)
  if (!providerId) return null

  const range = getTraderRangeOptions(asset.dateFrom, asset.dateTo)
  const rangeResponse = range.from && range.to
  const url = rangeResponse
    ? `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
        providerId,
      )}/market_chart/range?vs_currency=brl&from=${Math.floor(
        range.from.getTime() / 1000,
      )}&to=${Math.floor(range.to.getTime() / 1000)}`
    : `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
        providerId,
      )}/market_chart?vs_currency=brl&days=1&interval=hourly`

  const response = await fetch(
    url,
  )
  if (!response.ok) return null

  const data = await response.json()
  const prices = Array.isArray(data?.prices) ? data.prices : []
  if (!prices.length) return null

  const candles = prices.map(([timestamp, close], index) => {
    const date = new Date(timestamp)
    let label = `P${index + 1}`
    if (!Number.isNaN(date.getTime())) {
      label = formatTraderLabel(date, range.days)
    }
    const previous = Number(prices[Math.max(index - 1, 0)]?.[1] || close)
    const spread = Math.max(Number(close || 0) * 0.004, 0.01)
    return {
      label,
      open: Number(previous || close),
      high: Number(Math.max(previous, close) + spread),
      low: Number(Math.max(Math.min(previous, close) - spread, 0.0001)),
      close: Number(close || 0),
      timestamp: date,
    }
  })

  return buildSeriesResult(
    filterCandlesByDate(candles, range.from, range.to),
    'coingecko',
    new Date().toISOString(),
    false,
    range.days,
  )
}

export async function fetchTraderSeries(asset) {
  const cachedSeries = getCachedTraderSeries(asset)

  try {
    let series = null

    if (asset.type === 'Criptomoedas') {
      series = await fetchCoinGeckoSeries(asset)
    } else if (BRAZIL_LISTED_TYPES.has(asset.type)) {
      series =
        (await fetchBrapiSeries(asset)) ||
        (await fetchTwelveSeries(asset)) ||
        (await fetchAlphaSeries(asset))
    } else if (INTERNATIONAL_LISTED_TYPES.has(asset.type)) {
      series = (await fetchTwelveSeries(asset)) || (await fetchAlphaSeries(asset))
    }

    if (series) {
      setCachedTraderSeries(asset, series)
      return series
    }
    return cachedSeries
  } catch {
    return cachedSeries
  }
}
