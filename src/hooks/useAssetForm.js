import { useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext.jsx'
import { usePortfolio } from '@/context/PortfolioContext.jsx'
import { ASSET_TYPES, QUOTE_SOURCE_META } from '@/lib/constants'
import { createId, sanitizeText } from '@/lib/utils'
import { resolveAssetDetails } from '@/services/market'
import {
  getAutofillProviderLabels,
  getTypeRule,
  normalizeSymbolInput,
  validateAssetSymbol,
} from '@/utils/portfolio'

const emptyForm = {
  name: '',
  symbol: '',
  type: ASSET_TYPES[0],
  quantity: '',
  currentPrice: '',
  marketValue: '',
}

export function useAssetForm() {
  const { user } = useAuth()
  const { loading, error, savePortfolio, refreshPortfolio } = usePortfolio()
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [manualField, setManualField] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [autofillStatus, setAutofillStatus] = useState('')

  const symbolRule = getTypeRule(form.type)
  const symbolError = form.symbol ? validateAssetSymbol(form.type, form.symbol) : ''
  const providers = useMemo(() => getAutofillProviderLabels(form.type), [form.type])

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
    setManualField(null)
  }

  function updateForm(nextValues, source = '') {
    setForm((current) => {
      const next = { ...current, ...nextValues }
      const price = Number(next.currentPrice || 0)
      const quantity = Number(next.quantity || 0)
      const marketValue = Number(next.marketValue || 0)

      if (source === 'quantity' && price > 0) next.marketValue = (quantity * price).toFixed(2)
      if (source === 'marketValue' && price > 0) next.quantity = (marketValue / price).toFixed(4)
      if (source === 'currentPrice' && price > 0 && quantity > 0) next.marketValue = (quantity * price).toFixed(2)
      if (source === 'currentPrice' && price > 0 && !quantity && marketValue > 0) next.quantity = (marketValue / price).toFixed(4)

      return next
    })
  }

  function handleFormChange(event) {
    const { name, value } = event.target
    setFeedback('')

    if (name === 'type') {
      const nextProviders = getAutofillProviderLabels(value)
      updateForm({ type: value, symbol: normalizeSymbolInput(value, form.symbol) })
      setAutofillStatus(
        nextProviders.length
          ? `Autopreenchimento ativo. Ordem de busca: ${nextProviders.join(' -> ')}.`
          : 'Autopreenchimento indisponivel para este tipo. Preenchimento manual.',
      )
      return
    }

    if (name === 'symbol') {
      updateForm({ symbol: normalizeSymbolInput(form.type, value) })
      return
    }

    if (name === 'quantity') setManualField('quantity')
    if (name === 'marketValue') setManualField('marketValue')
    updateForm({ [name]: value }, name)
  }

  async function handleAutofill(field) {
    const payload = field === 'symbol' ? { symbol: form.symbol } : { name: form.name }
    if (!sanitizeText(payload.symbol || payload.name)) return
    if (field === 'name' && sanitizeText(form.symbol)) return

    setAutofillStatus('Buscando nome, tipo e preco atual...')
    const details = await resolveAssetDetails({ ...payload, type: form.type })
    if (!details) {
      setAutofillStatus('Nao foi possivel identificar o ativo com os dados informados.')
      return
    }

    updateForm(
      {
        symbol: normalizeSymbolInput(form.type, details.symbol || form.symbol),
        name: details.name || form.name,
        currentPrice: details.currentPrice > 0 ? Number(details.currentPrice).toFixed(2) : form.currentPrice,
      },
      'currentPrice',
    )
    setAutofillStatus(
      `Ativo identificado via ${QUOTE_SOURCE_META[details.source]?.label || details.source || 'API'}.`,
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const symbol = normalizeSymbolInput(form.type, form.symbol)
    const currentPrice =
      manualField && Number(form.quantity) > 0
        ? Number(form.marketValue) / Number(form.quantity)
        : Number(form.currentPrice || 0) || Number(form.marketValue || 0) / Number(form.quantity || 1)

    const nextAsset = {
      id: editingId || createId(),
      name: sanitizeText(form.name),
      symbol,
      type: sanitizeText(form.type),
      quantity: Number(form.quantity),
      currentPrice,
      averagePrice: currentPrice,
      marketValue: Number(form.marketValue),
      quoteMode: manualField ? 'manual' : 'auto',
      manualUpdatedAt: manualField ? new Date().toISOString() : null,
    }

    if (!nextAsset.name || !nextAsset.symbol || !nextAsset.type) {
      setFeedback('Preencha todos os campos obrigatorios.')
      return
    }

    const nextSymbolError = validateAssetSymbol(nextAsset.type, nextAsset.symbol)
    if (nextSymbolError) {
      setFeedback(nextSymbolError)
      return
    }

    if (nextAsset.quantity <= 0 || nextAsset.marketValue <= 0) {
      setFeedback('Quantidade e valor de mercado devem ser maiores que zero.')
      return
    }

    const portfolio = Array.isArray(user.portfolio) ? user.portfolio : []
    const nextPortfolio = editingId
      ? portfolio.map((asset) => (asset.id === editingId ? nextAsset : asset))
      : [...portfolio, nextAsset]

    setFeedback(editingId ? 'Salvando alteracoes...' : 'Atualizando carteira...')
    await savePortfolio(nextPortfolio)
    resetForm()
    setFeedback(editingId ? 'Ativo atualizado.' : 'Ativo adicionado.')
  }

  function startEdit(asset) {
    setEditingId(asset.id)
    setForm({
      name: asset.name,
      symbol: asset.symbol,
      type: asset.type,
      quantity: String(asset.quantity),
      currentPrice: String(asset.currentPrice || asset.averagePrice || ''),
      marketValue: Number(asset.marketValue || 0).toFixed(2),
    })
    setManualField(asset.quoteMode === 'manual' ? 'marketValue' : null)
    setFeedback('')
  }

  return {
    editingId,
    form,
    symbolRule,
    symbolError,
    providers,
    autofillStatus,
    feedback,
    error,
    loading,
    handleFormChange,
    handleAutofill,
    handleSubmit,
    refreshPortfolio,
    resetForm,
    startEdit,
  }
}
