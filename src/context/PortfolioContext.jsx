import { createContext, useContext, useMemo, useState } from 'react'
import { QUOTE_SOURCE_META } from '../lib/constants'
import { getUserByEmail, saveUserPortfolio } from '../lib/storage'
import { fetchAssetQuote } from '../services/market'
import { useAuth } from './AuthContext.jsx'

const PortfolioContext = createContext(null)

function normalizeAsset(asset) {
  return {
    ...asset,
    quantity: Number(asset.quantity || 0),
    averagePrice: Number(asset.averagePrice || asset.currentPrice || 0),
    currentPrice: Number(asset.currentPrice || asset.averagePrice || 0),
    marketValue: Number(asset.marketValue || 0),
  }
}

export function PortfolioProvider({ children }) {
  const { user, setUser } = useAuth()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function hydratePortfolio(sourceUser = user) {
    if (!sourceUser) {
      setAssets([])
      return []
    }

    setLoading(true)
    setError('')

    try {
      const portfolio = Array.isArray(sourceUser.portfolio) ? sourceUser.portfolio : []
      const hydrated = await Promise.all(
        portfolio.map(async (asset) => {
          const normalized = normalizeAsset(asset)
          const quote = await fetchAssetQuote(normalized)
          const currentPrice = Number(quote.price || normalized.currentPrice || normalized.averagePrice || 0)
          const marketValue = normalized.quantity * currentPrice
          const sourceMeta = QUOTE_SOURCE_META[quote.source] || QUOTE_SOURCE_META.fallback

          return {
            ...normalized,
            currentPrice,
            marketValue,
            variation: Number(quote.variation || 0),
            quoteSource: quote.source,
            quoteSourceLabel: sourceMeta.label || quote.source,
            quoteBadgeClass: sourceMeta.badgeClass,
            quoteUpdatedAt: quote.updatedAt,
            isFallbackQuote: Boolean(quote.isFallback),
            quoteReason: quote.reason || null,
          }
        }),
      )

      setAssets(hydrated)
      return hydrated
    } catch {
      setError('Nao foi possivel atualizar as cotacoes agora.')
      return []
    } finally {
      setLoading(false)
    }
  }

  async function savePortfolio(portfolio) {
    if (!user?.email) return null
    const updatedUser = saveUserPortfolio(user.email, portfolio)
    setUser(updatedUser)
    await hydratePortfolio(updatedUser)
    return updatedUser
  }

  async function refreshPortfolio() {
    if (!user?.email) return []
    const updatedUser = getUserByEmail(user.email)
    setUser(updatedUser)
    return hydratePortfolio(updatedUser)
  }

  const value = useMemo(
    () => ({ assets, loading, error, hydratePortfolio, savePortfolio, refreshPortfolio }),
    [assets, loading, error, user],
  )

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
}

export function usePortfolio() {
  const context = useContext(PortfolioContext)
  if (!context) throw new Error('usePortfolio deve ser usado dentro de PortfolioProvider')
  return context
}
