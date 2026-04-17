import Chart from 'chart.js/auto'
import {
  ASSET_TYPE_RULES,
  CHART_COLORS,
  LEGACY_ASSET_TYPE_MAP,
  QUOTE_SOURCE_META,
} from './lib/constants'
import { createId, sanitizeText } from './lib/utils'
import {
  clearSession,
  createSession,
  getSession,
  getUserByEmail,
  saveUserPortfolio,
  upsertUser,
} from './lib/storage'
import { fetchAssetQuote } from './services/market'
import { renderAuthView, renderDashboardView, renderLegend } from './ui/components'

export function createApp(root) {
  let state = {
    user: null,
    hydratedAssets: [],
    chart: null,
    editingAssetId: null,
    filters: {
      type: 'Todos',
      performance: 'Todos',
    },
  }
  let globalActionsBound = false

  function normalizeAssetType(type) {
    return LEGACY_ASSET_TYPE_MAP[type] || type
  }

  function normalizeAsset(asset) {
    return {
      ...asset,
      type: normalizeAssetType(asset.type),
      symbol: sanitizeText(asset.symbol).toUpperCase(),
    }
  }

  function getTypeRule(type) {
    return ASSET_TYPE_RULES[normalizeAssetType(type)] || ASSET_TYPE_RULES['Renda Fixa']
  }

  function validateAssetSymbol(type, symbol) {
    const rule = getTypeRule(type)
    return rule.symbolPattern.test(symbol)
      ? ''
      : rule.symbolError
  }

  function syncAssetFormHint() {
    const typeSelect = root.querySelector('#asset-type')
    const symbolInput = root.querySelector('#asset-symbol')
    const hint = root.querySelector('#asset-symbol-hint')
    if (!typeSelect || !symbolInput || !hint) return

    const rule = getTypeRule(typeSelect.value)
    symbolInput.placeholder = rule.symbolPlaceholder
    hint.textContent = rule.symbolHint
  }

  function getSummary(assets) {
    const totalValue = assets.reduce((sum, asset) => sum + asset.marketValue, 0)
    const totalInvested = assets.reduce(
      (sum, asset) => sum + Number(asset.quantity) * Number(asset.averagePrice),
      0,
    )

    return {
      totalValue,
      totalInvested,
      performance: totalInvested > 0 ? (totalValue - totalInvested) / totalInvested : 0,
    }
  }

  function getAllocation(assets) {
    const total = assets.reduce((sum, asset) => sum + asset.marketValue, 0)
    const grouped = assets.reduce((acc, asset) => {
      const entry = acc.get(asset.type) || { label: asset.type, value: 0, assetCount: 0 }
      entry.value += asset.marketValue
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

  function getEditingAsset() {
    if (!state.editingAssetId || !state.user) return null
    return state.user.portfolio.find((asset) => asset.id === state.editingAssetId) || null
  }

  function getFilteredAssets(assets) {
    return assets.filter((asset) => {
      const matchesType =
        state.filters.type === 'Todos' ? true : asset.type === state.filters.type

      let matchesPerformance = true
      if (state.filters.performance === 'Positivos') matchesPerformance = asset.variation > 0
      if (state.filters.performance === 'Negativos') matchesPerformance = asset.variation < 0
      if (state.filters.performance === 'Neutros') matchesPerformance = asset.variation === 0

      return matchesType && matchesPerformance
    })
  }

  async function hydratePortfolio(user) {
    const portfolio = Array.isArray(user?.portfolio) ? user.portfolio : []
    const hydratedAssets = await Promise.all(
      portfolio.map(async (asset) => {
        const normalizedAsset = normalizeAsset(asset)
        const quote = await fetchAssetQuote(normalizedAsset)
        const quantity = Number(normalizedAsset.quantity)
        const currentPrice = Number(quote.price || normalizedAsset.averagePrice || 0)

        return {
          ...normalizedAsset,
          quantity,
          averagePrice: Number(normalizedAsset.averagePrice),
          currentPrice,
          marketValue: quantity * currentPrice,
          variation: Number(quote.variation || 0),
          quoteSource: quote.source,
          quoteSourceLabel: QUOTE_SOURCE_META[quote.source]?.label || quote.source,
          quoteBadgeClass:
            QUOTE_SOURCE_META[quote.source]?.badgeClass ||
            'border-white/10 bg-white/5 text-zinc-200',
          quoteUpdatedAt: quote.updatedAt,
          isFallbackQuote: Boolean(quote.isFallback),
          quoteReason: quote.reason || null,
        }
      }),
    )

    state = { ...state, user, hydratedAssets }
  }

  function destroyChart() {
    if (state.chart) {
      state.chart.destroy()
      state.chart = null
    }
  }

  function renderChart(allocation) {
    destroyChart()
    const canvas = root.querySelector('#allocation-chart')
    const legend = root.querySelector('#allocation-legend')
    if (!canvas || !legend) return

    legend.innerHTML = renderLegend(allocation)
    if (!allocation.length) return

    state.chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: allocation.map((item) => item.label),
        datasets: [
          {
            data: allocation.map((item) => Number(item.value.toFixed(2))),
            backgroundColor: allocation.map((item) => item.color),
            borderWidth: 0,
            hoverOffset: 10,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                const value = Number(context.raw || 0)
                return `${context.label}: ${value.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}`
              },
            },
          },
        },
      },
    })
  }

  function bindAuthForm() {
    const form = root.querySelector('#login-form')
    if (!form) return

    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const feedback = root.querySelector('#auth-feedback')
      const formData = new FormData(form)
      const email = sanitizeText(formData.get('email')).toLowerCase()
      const password = sanitizeText(formData.get('password'))

      if (!email.includes('@')) {
        feedback.textContent = 'Informe um e-mail valido.'
        return
      }

      if (password.length < 6) {
        feedback.textContent = 'A senha deve ter pelo menos 6 caracteres.'
        return
      }

      const existingUser = getUserByEmail(email)
      if (existingUser && existingUser.password !== password) {
        feedback.textContent = 'Senha incorreta para esta conta local.'
        return
      }

      const user =
        existingUser ||
        upsertUser({
          email,
          password,
          portfolio: [],
          createdAt: new Date().toISOString(),
        })

      createSession(email)
      feedback.textContent = 'Carregando carteira...'
      await hydratePortfolio(user)
      render()
    })
  }

  function bindDashboardActions() {
    const assetForm = root.querySelector('#asset-form')
    const filtersForm = root.querySelector('#filters-form')
    const feedback = root.querySelector('#portfolio-feedback')

    syncAssetFormHint()

    assetForm?.addEventListener('change', (event) => {
      const target = event.target
      if (target instanceof HTMLSelectElement && target.name === 'type') {
        syncAssetFormHint()
      }
    })

    assetForm?.addEventListener('submit', async (event) => {
      event.preventDefault()
      const formData = new FormData(assetForm)
      const editingAsset = getEditingAsset()
      const asset = {
        id: editingAsset?.id || createId(),
        name: sanitizeText(formData.get('name')),
        symbol: sanitizeText(formData.get('symbol')).toUpperCase(),
        type: sanitizeText(formData.get('type')),
        quantity: Number(formData.get('quantity')),
        averagePrice: Number(formData.get('averagePrice')),
      }
      const symbolError = validateAssetSymbol(asset.type, asset.symbol)

      if (!asset.name || !asset.symbol || !asset.type) {
        feedback.textContent = 'Preencha todos os campos obrigatorios.'
        return
      }

      if (symbolError) {
        feedback.textContent = symbolError
        return
      }

      if (asset.quantity <= 0 || asset.averagePrice <= 0) {
        feedback.textContent = 'Quantidade e preco medio devem ser maiores que zero.'
        return
      }

      const updatedPortfolio = editingAsset
        ? state.user.portfolio.map((currentAsset) =>
            currentAsset.id === editingAsset.id ? asset : currentAsset,
          )
        : [...state.user.portfolio, asset]

      const updatedUser = saveUserPortfolio(state.user.email, updatedPortfolio)
      feedback.textContent = editingAsset ? 'Salvando alteracoes...' : 'Atualizando carteira...'
      await hydratePortfolio(updatedUser)
      state = { ...state, editingAssetId: null }
      render()
    })

    filtersForm?.addEventListener('change', (event) => {
      const target = event.target
      if (!(target instanceof HTMLSelectElement)) return

      state = {
        ...state,
        filters: {
          ...state.filters,
          [target.name]: target.value,
        },
      }
      render()
    })

    bindGlobalActions()
  }

  function bindGlobalActions() {
    if (globalActionsBound) return
    globalActionsBound = true

    root.addEventListener('click', async (event) => {
      const target = event.target.closest('[data-action]')
      if (!target) return

      const { action, assetId } = target.dataset
      const feedback = root.querySelector('#portfolio-feedback')

      if (action === 'logout') {
        clearSession()
        destroyChart()
        state = {
          ...state,
          user: null,
          hydratedAssets: [],
          editingAssetId: null,
        }
        render()
        return
      }

      if (!state.user) return

      if (action === 'refresh-quotes') {
        if (feedback) feedback.textContent = 'Buscando cotacoes mais recentes...'
        await hydratePortfolio(getUserByEmail(state.user.email))
        render()
        return
      }

      if (action === 'start-edit' && assetId) {
        state = { ...state, editingAssetId: assetId }
        render()
        return
      }

      if (action === 'cancel-edit') {
        state = { ...state, editingAssetId: null }
        render()
        return
      }

      if (action === 'delete-asset' && assetId) {
        const updatedPortfolio = state.user.portfolio.filter((asset) => asset.id !== assetId)
        const updatedUser = saveUserPortfolio(state.user.email, updatedPortfolio)
        await hydratePortfolio(updatedUser)
        state = {
          ...state,
          editingAssetId: state.editingAssetId === assetId ? null : state.editingAssetId,
        }
        render()
      }
    })
  }

  function render() {
    if (!state.user) {
      destroyChart()
      root.innerHTML = renderAuthView()
      bindAuthForm()
      return
    }

    const filteredAssets = getFilteredAssets(state.hydratedAssets)
    const summary = getSummary(filteredAssets)
    const allocation = getAllocation(filteredAssets)
    root.innerHTML = renderDashboardView({
      user: state.user,
      summary,
      assets: filteredAssets,
      totalAssetsCount: state.hydratedAssets.length,
      filters: state.filters,
      editingAsset: getEditingAsset(),
    })
    renderChart(allocation)
    bindDashboardActions()
  }

  async function init() {
    const session = getSession()
    if (session?.email) {
      const user = getUserByEmail(session.email)
      if (user) {
        await hydratePortfolio(user)
      }
    }

    render()
  }

  return { init }
}
