import { useEffect, useMemo, useState } from 'react'
import AllocationChart from '@/components/charts/AllocationChart.jsx'
import AssetForm from '@/components/portfolio/AssetForm.jsx'
import AssetList from '@/components/portfolio/AssetList.jsx'
import PortfolioFilters from '@/components/portfolio/PortfolioFilters.jsx'
import SummaryCard from '@/components/portfolio/SummaryCard.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '../context/AuthContext.jsx'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import AppLayout from '@/components/layout/AppLayout.jsx'
import { ASSET_TYPES, QUOTE_SOURCE_META } from '../lib/constants'
import { createId, formatCurrency, formatPercent, sanitizeText } from '../lib/utils'
import { resolveAssetDetails } from '../services/market'
import {
  getAllocation,
  getAutofillProviderLabels,
  getSummary,
  getTypeRule,
  normalizeSymbolInput,
  validateAssetSymbol,
} from '../utils/portfolio'

const emptyForm = {
  name: '',
  symbol: '',
  type: ASSET_TYPES[0],
  quantity: '',
  currentPrice: '',
  marketValue: '',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { assets, loading, error, hydratePortfolio, savePortfolio, refreshPortfolio } = usePortfolio()
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [manualField, setManualField] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [autofillStatus, setAutofillStatus] = useState('')
  const [filters, setFilters] = useState({ type: 'Todos', performance: 'Todos' })

  useEffect(() => {
    hydratePortfolio(user)
  }, [user?.email])

  const filteredAssets = useMemo(
    () =>
      assets.filter((asset) => {
        const matchesType = filters.type === 'Todos' || asset.type === filters.type
        let matchesPerformance = true
        if (filters.performance === 'Positivos') matchesPerformance = asset.variation > 0
        if (filters.performance === 'Negativos') matchesPerformance = asset.variation < 0
        if (filters.performance === 'Neutros') matchesPerformance = asset.variation === 0
        return matchesType && matchesPerformance
      }),
    [assets, filters],
  )

  const summary = useMemo(() => getSummary(filteredAssets), [filteredAssets])
  const allocation = useMemo(() => getAllocation(filteredAssets), [filteredAssets])
  const symbolRule = getTypeRule(form.type)
  const symbolError = form.symbol ? validateAssetSymbol(form.type, form.symbol) : ''
  const providers = getAutofillProviderLabels(form.type)

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
    setEditingId(null)
    setForm(emptyForm)
    setManualField(null)
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

  async function deleteAsset(assetId) {
    const nextPortfolio = (user.portfolio || []).filter((asset) => asset.id !== assetId)
    await savePortfolio(nextPortfolio)
    if (editingId === assetId) {
      setEditingId(null)
      setForm(emptyForm)
    }
  }

  return (
    <AppLayout
      eyebrow="Dashboard"
      title={`Ola, ${user.email}`}
      description="Acompanhe patrimonio, distribuicao e ativos da sua carteira em uma base preparada para futura integracao com backend."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Patrimonio total" value={formatCurrency(summary.totalValue)} helper="Atualizado com o ultimo preco disponivel." tone="cyan" />
        <SummaryCard label="Capital investido" value={formatCurrency(summary.totalInvested)} helper="Soma calculada pela posicao da carteira." tone="emerald" />
        <SummaryCard label="Rentabilidade" value={formatPercent(summary.performance)} helper="Diferenca entre patrimonio atual e custo total." tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardDescription>{editingId ? 'Ajustar posicao atual' : 'Cadastrar posicao'}</CardDescription>
            <CardTitle>{editingId ? 'Editar ativo' : 'Novo ativo'}</CardTitle>
          </CardHeader>
          <CardContent>
            <AssetForm
              editingId={editingId}
              form={form}
              symbolRule={symbolRule}
              symbolError={symbolError}
              providers={providers}
              autofillStatus={autofillStatus}
              feedback={feedback}
              error={error}
              loading={loading}
              onChange={handleFormChange}
              onSubmit={handleSubmit}
              onAutofill={handleAutofill}
              onRefresh={refreshPortfolio}
              onCancel={() => { setEditingId(null); setForm(emptyForm); setManualField(null) }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Carteira por categoria</CardDescription>
            <CardTitle>Distribuicao</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationChart allocation={allocation} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardDescription>Ativos cadastrados</CardDescription>
          <CardTitle>Carteira</CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioFilters filters={filters} setFilters={setFilters} total={assets.length} visible={filteredAssets.length} />
          <div className="mt-5">
          <AssetList assets={filteredAssets} onEdit={startEdit} onDelete={deleteAsset} />
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  )
}
