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
import { fetchAssetQuote, resolveAssetDetails } from './services/market'
import { renderAuthView, renderDashboardView, renderLegend } from './ui/components'

export function createApp(root) {
  let state = {
    user: null,
    hydratedAssets: [],
    chart: null,
    editingAssetId: null,
    assetLookupToken: 0,
    assetFormState: {
      syncing: false,
      manualField: null,
    },
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

  function getAssetFormElements() {
    return {
      form: root.querySelector('#asset-form'),
      typeSelect: root.querySelector('#asset-type'),
      symbolInput: root.querySelector('#asset-symbol'),
      nameInput: root.querySelector('#asset-name'),
      quantityInput: root.querySelector('#asset-quantity'),
      marketPriceInput: root.querySelector('#asset-market-price'),
      marketValueInput: root.querySelector('#asset-market-value'),
      hint: root.querySelector('#asset-symbol-hint'),
      status: root.querySelector('#asset-symbol-status'),
      autofillStatus: root.querySelector('#asset-autofill-status'),
      feedback: root.querySelector('#portfolio-feedback'),
    }
  }

  function validateAssetSymbol(type, symbol) {
    const rule = getTypeRule(type)
    return rule.symbolPattern.test(symbol)
      ? ''
      : rule.symbolError
  }

  function normalizeSymbolInput(type, symbol) {
    const trimmed = sanitizeText(symbol)
    if (!trimmed) return ''

    if (type === 'Criptomoedas') {
      return trimmed.replace(/\s+/g, '').replace(/_/g, '-')
    }

    return trimmed.toUpperCase().replace(/\s+/g, '')
  }

  function updateSymbolValidationState() {
    const { typeSelect, symbolInput, hint, status } = getAssetFormElements()
    if (!typeSelect || !symbolInput || !hint || !status) return

    const normalizedSymbol = normalizeSymbolInput(typeSelect.value, symbolInput.value)
    if (symbolInput.value !== normalizedSymbol) {
      symbolInput.value = normalizedSymbol
    }

    if (!normalizedSymbol) {
      symbolInput.classList.remove('border-emerald-400/50', 'border-rose-400/50')
      symbolInput.classList.add('border-white/10')
      status.textContent = 'Preencha o ticker conforme o padrao do tipo selecionado.'
      status.className = 'mt-2 text-xs leading-5 text-zinc-500'
      return
    }

    const symbolError = validateAssetSymbol(typeSelect.value, normalizedSymbol)
    if (symbolError) {
      symbolInput.classList.remove('border-white/10', 'border-emerald-400/50')
      symbolInput.classList.add('border-rose-400/50')
      status.textContent = symbolError
      status.className = 'mt-2 text-xs leading-5 text-rose-300'
      return
    }

    symbolInput.classList.remove('border-white/10', 'border-rose-400/50')
    symbolInput.classList.add('border-emerald-400/50')
    status.textContent = 'Formato valido para o tipo selecionado.'
    status.className = 'mt-2 text-xs leading-5 text-emerald-300'
  }

  function syncAssetFormHint() {
    const { typeSelect, symbolInput, hint } = getAssetFormElements()
    if (!typeSelect || !symbolInput || !hint) return

    const rule = getTypeRule(typeSelect.value)
    symbolInput.placeholder = rule.symbolPlaceholder
    hint.textContent = rule.symbolHint
    updateSymbolValidationState()

    const providers = getAutofillProviderLabels(typeSelect.value)
    if (providers.length) {
      setAutofillStatus(
        `Autopreenchimento ativo para ${typeSelect.value}. Ordem de busca: ${providers.join(' -> ')}.`,
        'neutral',
      )
      return
    }

    setAutofillStatus(
      `Autopreenchimento indisponivel para ${typeSelect.value}. Preenchimento manual para este tipo.`,
      'neutral',
    )
  }

  function setAutofillStatus(message, tone = 'neutral') {
    const { autofillStatus } = getAssetFormElements()
    if (!autofillStatus) return

    const toneMap = {
      neutral: 'text-zinc-500',
      loading: 'text-cyan-300',
      success: 'text-emerald-300',
      error: 'text-rose-300',
    }

    autofillStatus.textContent = message
    autofillStatus.className = `min-h-5 text-xs leading-5 ${toneMap[tone] || toneMap.neutral}`
  }

  function getAutofillProviderLabels(type) {
    if (type === 'Criptomoedas') return ['CoinGecko']
    if (type === 'Ações' || type === 'FIIs' || type === 'BDRs' || type === 'ETFs') {
      return ['BrAPI', 'Twelve Data', 'Alpha Vantage']
    }
    if (type === 'Ações Internacionais') return ['Twelve Data', 'Alpha Vantage']
    return []
  }

  function getQuoteSourceLabel(source) {
    return QUOTE_SOURCE_META[source]?.label || source || 'API'
  }

  function getNumericInputValue(input) {
    return input ? Number(input.value || 0) : 0
  }

  function setInputValue(input, value, decimals = 4) {
    if (!input) return
    input.value = Number.isFinite(value) && value > 0 ? value.toFixed(decimals) : ''
  }

  function resetAssetFormSync() {
    state = {
      ...state,
      assetFormState: {
        syncing: false,
        manualField: null,
      },
    }
  }

  function syncDerivedMarketValues(source, options = {}) {
    const { marketPriceInput, quantityInput, marketValueInput } = getAssetFormElements()
    if (!marketPriceInput || !quantityInput || !marketValueInput) return

    const price = getNumericInputValue(marketPriceInput)
    if (price <= 0) return

    const allowManualOverride = options.allowManualOverride === true
    const manualField = state.assetFormState.manualField

    if (!allowManualOverride && manualField) return

    state = {
      ...state,
      assetFormState: {
        ...state.assetFormState,
        syncing: true,
      },
    }

    if (source === 'quantity') {
      setInputValue(marketValueInput, getNumericInputValue(quantityInput) * price, 2)
      state = {
        ...state,
        assetFormState: {
          ...state.assetFormState,
          syncing: false,
        },
      }
      return
    }

    if (source === 'marketValue') {
      setInputValue(marketValueInput, getNumericInputValue(marketValueInput), 2)
      setInputValue(quantityInput, getNumericInputValue(marketValueInput) / price, 4)
      state = {
        ...state,
        assetFormState: {
          ...state.assetFormState,
          syncing: false,
        },
      }
      return
    }

    if (source === 'marketPrice') {
      if (getNumericInputValue(quantityInput) > 0) {
        setInputValue(marketValueInput, getNumericInputValue(quantityInput) * price, 2)
      } else if (getNumericInputValue(marketValueInput) > 0) {
        setInputValue(quantityInput, getNumericInputValue(marketValueInput) / price, 4)
      }
    }

    state = {
      ...state,
      assetFormState: {
        ...state.assetFormState,
        syncing: false,
      },
    }
  }

  function applyResolvedAssetDetails(details) {
    const {
      typeSelect,
      symbolInput,
      nameInput,
      marketPriceInput,
      marketValueInput,
      quantityInput,
    } = getAssetFormElements()
    if (!details) return
    const selectedType = normalizeAssetType(typeSelect?.value)

    if (symbolInput && details.symbol) {
      symbolInput.value = normalizeSymbolInput(selectedType, details.symbol)
    }
    if (nameInput && details.name && !sanitizeText(nameInput.value)) {
      nameInput.value = details.name
    } else if (nameInput && details.name) {
      nameInput.value = details.name
    }
    if (marketPriceInput && details.currentPrice > 0) {
      setInputValue(marketPriceInput, Number(details.currentPrice), 2)
    }

    resetAssetFormSync()
    syncAssetFormHint()
    updateSymbolValidationState()
    syncDerivedMarketValues('marketPrice', { allowManualOverride: true })

    if (marketValueInput && quantityInput) {
      const quantity = getNumericInputValue(quantityInput)
      const marketValue = getNumericInputValue(marketValueInput)
      if (quantity > 0 && Number(details.currentPrice) > 0) {
        setInputValue(marketValueInput, quantity * Number(details.currentPrice), 2)
      } else if (marketValue > 0 && Number(details.currentPrice) > 0) {
        setInputValue(quantityInput, marketValue / Number(details.currentPrice), 4)
      }
    }
  }

  async function runAssetAutofill({ symbol = '', name = '' }) {
    const { typeSelect } = getAssetFormElements()
    if (!typeSelect) return

    const hasSymbol = sanitizeText(symbol)
    const hasName = sanitizeText(name)
    if (!hasSymbol && !hasName) {
      setAutofillStatus('Preencha o codigo ou o nome para buscar dados do ativo.', 'neutral')
      return
    }

    const token = state.assetLookupToken + 1
    state = { ...state, assetLookupToken: token }
    setAutofillStatus('Buscando nome, tipo e preco atual...', 'loading')

    const details = await resolveAssetDetails({
      symbol: hasSymbol,
      name: hasName,
      type: typeSelect.value,
    })

    if (state.assetLookupToken !== token) return

    if (!details) {
      const providers = getAutofillProviderLabels(typeSelect.value)
      const providerText = providers.length
        ? ` Provedores consultados: ${providers.join(', ')}.`
        : ''
      setAutofillStatus(
        `Nao foi possivel identificar o ativo com os dados informados.${providerText}`,
        'error',
      )
      return
    }

    applyResolvedAssetDetails(details)
    setAutofillStatus(
      `Ativo identificado e campos preenchidos automaticamente via ${getQuoteSourceLabel(details.source)}.`,
      'success',
    )
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
    const { symbolInput, nameInput, quantityInput, marketValueInput, marketPriceInput } =
      getAssetFormElements()

    syncAssetFormHint()
    resetAssetFormSync()
    syncDerivedMarketValues('marketPrice', { allowManualOverride: true })

    assetForm?.addEventListener('change', (event) => {
      const target = event.target
      if (target instanceof HTMLSelectElement && target.name === 'type') {
        syncAssetFormHint()
      }
    })

    assetForm?.addEventListener('input', (event) => {
      const target = event.target
      if (!(target instanceof HTMLInputElement)) return

      if (target.name === 'symbol') {
        updateSymbolValidationState()
      }

      if (target.name === 'quantity') {
        if (!state.assetFormState.syncing) {
          state = {
            ...state,
            assetFormState: {
              ...state.assetFormState,
              manualField: 'quantity',
            },
          }
        }
        syncDerivedMarketValues('quantity')
      }

      if (target.name === 'marketValue') {
        if (!state.assetFormState.syncing) {
          state = {
            ...state,
            assetFormState: {
              ...state.assetFormState,
              manualField: 'marketValue',
            },
          }
        }
        syncDerivedMarketValues('marketValue')
      }

      if (target.name === 'currentPrice') {
        syncDerivedMarketValues('marketPrice', { allowManualOverride: true })
      }
    })

    symbolInput?.addEventListener('blur', () => {
      runAssetAutofill({ symbol: symbolInput.value })
    })

    nameInput?.addEventListener('blur', () => {
      if (!sanitizeText(symbolInput?.value)) {
        runAssetAutofill({ name: nameInput.value })
      }
    })

    marketPriceInput?.addEventListener('blur', () => {
      syncDerivedMarketValues('marketPrice', { allowManualOverride: true })
    })

    assetForm?.addEventListener('submit', async (event) => {
      event.preventDefault()
      const formData = new FormData(assetForm)
      const editingAsset = getEditingAsset()
      const asset = {
        id: editingAsset?.id || createId(),
        name: sanitizeText(formData.get('name')),
        symbol: normalizeSymbolInput(
          sanitizeText(formData.get('type')),
          sanitizeText(formData.get('symbol')),
        ),
        type: sanitizeText(formData.get('type')),
        quantity: Number(formData.get('quantity')),
        currentPrice: Number(formData.get('currentPrice')),
        marketValue: Number(formData.get('marketValue')),
      }
      const symbolError = validateAssetSymbol(asset.type, asset.symbol)
      const derivedCurrentPrice = state.assetFormState.manualField
        ? asset.quantity > 0
          ? asset.marketValue / asset.quantity
          : 0
        : asset.currentPrice !== 0
          ? asset.currentPrice
          : asset.quantity > 0 && asset.marketValue !== 0
            ? asset.marketValue / asset.quantity
            : 0

      asset.currentPrice = derivedCurrentPrice
      asset.averagePrice = derivedCurrentPrice
      asset.quoteMode = state.assetFormState.manualField ? 'manual' : 'auto'
      asset.manualUpdatedAt = asset.quoteMode === 'manual' ? new Date().toISOString() : null

      if (!asset.name || !asset.symbol || !asset.type) {
        feedback.textContent = 'Preencha todos os campos obrigatorios.'
        return
      }

      if (symbolError) {
        feedback.textContent = symbolError
        return
      }

      if (asset.quantity <= 0 || asset.marketValue === 0) {
        feedback.textContent = 'Quantidade deve ser maior que zero e o valor de mercado nao pode ser zero.'
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
