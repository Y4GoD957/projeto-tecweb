import { useEffect, useMemo, useState } from 'react'
import AllocationChart from '../components/Charts/AllocationChart.jsx'
import Button from '../components/Button/Button.jsx'
import Card from '../components/Card/Card.jsx'
import Input from '../components/Input/Input.jsx'
import AppLayout from '../components/Layout/AppLayout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { ASSET_TYPES, QUOTE_SOURCE_META, TYPE_BADGES } from '../lib/constants'
import { createId, formatCurrency, formatDateTime, formatPercent, getVariationTone, sanitizeText } from '../lib/utils'
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
        <SummaryCard label="Patrimonio total" value={formatCurrency(summary.totalValue)} helper="Atualizado com o ultimo preco disponivel." />
        <SummaryCard label="Capital investido" value={formatCurrency(summary.totalInvested)} helper="Soma calculada pela posicao da carteira." />
        <SummaryCard label="Rentabilidade" value={formatPercent(summary.performance)} helper="Diferenca entre patrimonio atual e custo total." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card title={editingId ? 'Editar ativo' : 'Novo ativo'} description={editingId ? 'Ajustar posicao atual' : 'Cadastrar posicao'}>
          <form className="grid gap-4 md:grid-cols-2" autoComplete="off" onSubmit={handleSubmit}>
            <Input label="Nome do ativo" name="name" value={form.name} onChange={handleFormChange} onBlur={() => handleAutofill('name')} placeholder="Tesouro Selic 2029" required />
            <Input label="Ticker / Codigo" name="symbol" value={form.symbol} onChange={handleFormChange} onBlur={() => handleAutofill('symbol')} placeholder={symbolRule.symbolPlaceholder} hint={symbolRule.symbolHint} error={symbolError} required className="uppercase" />
            <Input label="Tipo" as="select" name="type" value={form.type} onChange={handleFormChange} required className="bg-slate-950">
              {ASSET_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </Input>
            <Input label="Quantidade" name="quantity" type="number" min="0.0001" step="0.0001" value={form.quantity} onChange={handleFormChange} placeholder="10" required />
            <Input label="Valor atual de mercado (BRL)" name="marketValue" type="number" min="0.01" step="0.01" value={form.marketValue} onChange={handleFormChange} placeholder="0.00" required />
            <input type="hidden" name="currentPrice" value={form.currentPrice} readOnly />
            <p className="min-h-5 text-xs leading-5 text-zinc-500 md:col-span-2">
              {autofillStatus || (providers.length ? `Autopreenchimento disponivel via ${providers.join(', ')}.` : 'Preenchimento manual para este tipo.')}
            </p>
            <Button type="submit">{editingId ? 'Salvar ativo' : 'Adicionar ativo'}</Button>
            <Button type="button" variant="secondary" onClick={refreshPortfolio} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar cotacoes'}
            </Button>
            {editingId ? (
              <Button type="button" variant="accent" className="md:col-span-2" onClick={() => { setEditingId(null); setForm(emptyForm); setManualField(null) }}>
                Cancelar edicao
              </Button>
            ) : null}
          </form>
          <p className="mt-4 min-h-6 text-sm text-zinc-400">{feedback || error}</p>
        </Card>

        <Card title="Distribuicao" description="Carteira por categoria">
          <AllocationChart allocation={allocation} />
        </Card>
      </section>

      <Card title="Carteira" description="Ativos cadastrados">
        <Filters filters={filters} setFilters={setFilters} total={assets.length} visible={filteredAssets.length} />
        <div className="mt-5">
          <AssetList assets={filteredAssets} onEdit={startEdit} onDelete={deleteAsset} />
        </div>
      </Card>
    </AppLayout>
  )
}

function SummaryCard({ label, value, helper }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm text-zinc-400">{helper}</p>
    </div>
  )
}

function Filters({ filters, setFilters, total, visible }) {
  function handleChange(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <Input label="Tipo" as="select" name="type" value={filters.type} onChange={handleChange} className="bg-slate-950">
        {['Todos', ...ASSET_TYPES].map((type) => <option key={type} value={type}>{type}</option>)}
      </Input>
      <Input label="Desempenho" as="select" name="performance" value={filters.performance} onChange={handleChange} className="bg-slate-950">
        {['Todos', 'Positivos', 'Negativos', 'Neutros'].map((option) => <option key={option} value={option}>{option}</option>)}
      </Input>
      <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-zinc-300">
        {visible} de {total} ativo(s)
      </div>
    </div>
  )
}

function AssetList({ assets, onEdit, onDelete }) {
  if (!assets.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 p-8 text-center">
        <p className="text-lg font-medium text-white">Nenhum ativo encontrado</p>
        <p className="mt-2 text-sm text-zinc-400">Ajuste os filtros ou cadastre um novo ativo.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {assets.map((asset) => (
        <article key={asset.id} className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/35 p-4 lg:grid-cols-[1.45fr_0.95fr_0.75fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-medium text-white">{asset.name}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${TYPE_BADGES[asset.type] || 'bg-white/10 text-zinc-200'}`}>{asset.type}</span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">{asset.symbol}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">Quantidade {asset.quantity}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${asset.quoteBadgeClass}`}>
                {asset.quoteSourceLabel}
              </span>
              <span className="text-xs text-zinc-500">Atualizado em {formatDateTime(asset.quoteUpdatedAt)}</span>
              <span className="basis-full text-xs text-zinc-500">
                {asset.isFallbackQuote ? 'Estimativa local usada quando a API nao retorna cotacao valida.' : 'Cotacao carregada por provedor externo.'}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Valor atual</p>
            <p className="mt-2 text-lg font-medium text-white">{formatCurrency(asset.marketValue)}</p>
            <p className="mt-1 text-sm text-zinc-400">Fonte: {asset.quoteSourceLabel}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Variacao</p>
            <p className={`mt-2 text-lg font-medium ${getVariationTone(asset.variation)}`}>{formatPercent(asset.variation)}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" className="h-10" onClick={() => onEdit(asset)}>Editar</Button>
            <Button type="button" variant="danger" className="h-10" onClick={() => onDelete(asset.id)}>Remover</Button>
          </div>
        </article>
      ))}
    </div>
  )
}
