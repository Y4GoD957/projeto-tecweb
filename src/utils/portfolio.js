import { ASSET_TYPE_RULES, CHART_COLORS, LEGACY_ASSET_TYPE_MAP } from '../lib/constants'
import { sanitizeText } from '../lib/utils'

export function normalizeAssetType(type) {
  return LEGACY_ASSET_TYPE_MAP[type] || type
}

export function getTypeRule(type) {
  return ASSET_TYPE_RULES[normalizeAssetType(type)] || ASSET_TYPE_RULES['Renda Fixa']
}

export function normalizeSymbolInput(type, symbol) {
  const trimmed = sanitizeText(symbol)
  if (!trimmed) return ''
  if (type === 'Criptomoedas') return trimmed.replace(/\s+/g, '').replace(/_/g, '-')
  return trimmed.toUpperCase().replace(/\s+/g, '')
}

export function validateAssetSymbol(type, symbol) {
  const rule = getTypeRule(type)
  return rule.symbolPattern.test(symbol) ? '' : rule.symbolError
}

export function getAutofillProviderLabels(type) {
  if (type === 'Criptomoedas') return ['CoinGecko']
  if (type === 'Ações' || type === 'FIIs' || type === 'BDRs' || type === 'ETFs') {
    return ['BrAPI', 'Twelve Data', 'Alpha Vantage']
  }
  if (type === 'Ações Internacionais') return ['Twelve Data', 'Alpha Vantage']
  return []
}

export function getSummary(assets) {
  const totalValue = assets.reduce((sum, asset) => sum + Number(asset.marketValue || 0), 0)
  const totalInvested = assets.reduce(
    (sum, asset) => sum + Number(asset.quantity || 0) * Number(asset.averagePrice || 0),
    0,
  )
  return {
    totalValue,
    totalInvested,
    performance: totalInvested > 0 ? (totalValue - totalInvested) / totalInvested : 0,
  }
}

export function getAllocation(assets) {
  const total = assets.reduce((sum, asset) => sum + Number(asset.marketValue || 0), 0)
  const grouped = assets.reduce((acc, asset) => {
    const entry = acc.get(asset.type) || { label: asset.type, value: 0, assetCount: 0 }
    entry.value += Number(asset.marketValue || 0)
    entry.assetCount += 1
    acc.set(asset.type, entry)
    return acc
  }, new Map())

  return [...grouped.values()].map((item, index) => ({
    ...item,
    color: CHART_COLORS[index % CHART_COLORS.length],
    share: total > 0 ? item.value / total : 0,
  }))
}
