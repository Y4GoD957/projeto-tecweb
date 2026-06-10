import { useMemo, useState } from 'react'
import Button from '../components/Button/Button.jsx'
import CandleChart, { TraderLegend } from '../components/Charts/CandleChart.jsx'
import Card from '../components/Card/Card.jsx'
import Input from '../components/Input/Input.jsx'
import AppLayout from '../components/Layout/AppLayout.jsx'
import { QUOTE_SOURCE_META, TYPE_BADGES } from '../lib/constants'
import { fetchAssetQuote, fetchTraderSeries, searchTraderAssets } from '../services/market'
import { sanitizeText } from '../lib/utils'

const traderTypes = ['Ações', 'FIIs', 'BDRs', 'ETFs', 'Ações Internacionais', 'Criptomoedas']
const presets = { '1D': 1, '1W': 7, '1M': 30, '3M': 90 }

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function pastIso(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export default function TraderPage() {
  const [search, setSearch] = useState({ traderType: 'Ações', traderQuery: '' })
  const [results, setResults] = useState([])
  const [selectedAssets, setSelectedAssets] = useState([])
  const [activeAssetId, setActiveAssetId] = useState(null)
  const [period, setPeriod] = useState({ from: pastIso(1), to: todayIso(), preset: '1D' })
  const [status, setStatus] = useState('Busque um ticker ou nome para carregar ativos direto das APIs.')
  const [loading, setLoading] = useState(false)

  const selectedIds = useMemo(() => selectedAssets.map((asset) => asset.id), [selectedAssets])

  async function handleSearchSubmit(event) {
    event.preventDefault()
    const query = sanitizeText(search.traderQuery)
    if (!query) {
      setResults([])
      setStatus('Digite um ticker ou nome para consultar os ativos nas APIs.')
      return
    }

    setLoading(true)
    setStatus(`Buscando ativos de ${search.traderType} nas APIs...`)
    const nextResults = await searchTraderAssets({ query, type: search.traderType })
    setResults(nextResults)
    setStatus(
      nextResults.length
        ? `${nextResults.length} ativo(s) encontrado(s) em provedores de mercado.`
        : `Nenhum ativo encontrado para ${query} em ${search.traderType}.`,
    )
    setLoading(false)
  }

  async function loadSeries(asset, range = period) {
    const quote = await fetchAssetQuote({ symbol: asset.symbol, type: asset.type })
    const series = await fetchTraderSeries({
      ...asset,
      currentPrice: Number(quote.price || asset.currentPrice || 0),
      variation: Number(quote.variation || asset.variation || 0),
      dateFrom: range.from,
      dateTo: range.to,
    })
    const candles = Array.isArray(series?.candles) ? series.candles : []
    const firstClose = Number(candles[0]?.close || 0)
    const lastClose = Number(candles[candles.length - 1]?.close || 0)
    const source = series?.source || quote.source || 'fallback'

    return {
      ...asset,
      currentPrice: lastClose || Number(quote.price || 0),
      variation: firstClose > 0 ? (lastClose - firstClose) / firstClose : Number(quote.variation || 0),
      quoteSourceLabel: QUOTE_SOURCE_META[source]?.label || source,
      periodOpen: Number(candles[0]?.open || 0),
      periodHigh: candles.length ? Math.max(...candles.map((item) => Number(item.high || 0))) : 0,
      periodLow: candles.length ? Math.min(...candles.map((item) => Number(item.low || 0)).filter((value) => value > 0)) : 0,
      periodClose: lastClose,
      series,
      seriesError: !series,
      usedCachedSeries: Boolean(series?.fromCache),
    }
  }

  async function toggleAsset(asset, checked) {
    if (!checked) {
      const remaining = selectedAssets.filter((item) => item.id !== asset.id)
      setSelectedAssets(remaining)
      setActiveAssetId((current) => (current === asset.id ? remaining[0]?.id || null : current))
      setStatus('Ativo removido do painel trader.')
      return
    }

    if (selectedAssets.some((item) => item.id === asset.id)) return
    setLoading(true)
    setStatus(`Carregando serie de preco para ${asset.symbol}...`)
    const enriched = await loadSeries(asset)
    setSelectedAssets((current) => [...current, enriched])
    setActiveAssetId((current) => current || enriched.id)
    setStatus(`Serie carregada para ${asset.symbol} via ${enriched.quoteSourceLabel || 'API'}.`)
    setLoading(false)
  }

  async function reloadForPeriod(nextPeriod) {
    if (!selectedAssets.length) {
      setStatus('Defina um periodo e selecione ao menos um ativo para carregar a serie.')
      return
    }

    setLoading(true)
    setStatus(`Atualizando series entre ${nextPeriod.from} e ${nextPeriod.to}...`)
    const reloaded = await Promise.all(selectedAssets.map((asset) => loadSeries(asset, nextPeriod)))
    setSelectedAssets(reloaded)
    setActiveAssetId((current) => reloaded.find((asset) => asset.id === current)?.id || reloaded[0]?.id || null)
    setStatus(
      reloaded.some((asset) => asset.seriesError)
        ? 'Alguns ativos nao retornaram serie para esse periodo.'
        : reloaded.some((asset) => asset.usedCachedSeries)
          ? 'Periodo aplicado. Parte das series veio do cache local.'
          : 'Periodo aplicado ao candle chart.',
    )
    setLoading(false)
  }

  async function handlePeriodSubmit(event) {
    event.preventDefault()
    if (!period.from || !period.to || period.from > period.to) {
      setStatus('Defina um intervalo valido para o grafico.')
      return
    }
    const nextPeriod = { ...period, preset: '' }
    setPeriod(nextPeriod)
    await reloadForPeriod(nextPeriod)
  }

  async function applyPreset(preset) {
    const nextPeriod = { from: pastIso(presets[preset]), to: todayIso(), preset }
    setPeriod(nextPeriod)
    await reloadForPeriod(nextPeriod)
  }

  return (
    <AppLayout
      eyebrow="Trader"
      title="Painel de comparacao"
      description="Pesquise ativos no mercado e acompanhe candles como painel trader, sem depender dos ativos cadastrados na carteira."
    >
      <section className="grid gap-6">
        <Card title="Painel Trader" description="Busca de mercado e graficos por ativo">
          <div className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
              <p className="text-sm text-zinc-300">
                Busque ativos direto nas APIs de mercado. Selecione um ou mais, e abra o ativo desejado para ver o candle chart.
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.28em] text-zinc-500">
                {selectedAssets.length} ativo(s) selecionado(s)
              </p>
            </div>

            <form className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end" autoComplete="off" onSubmit={handleSearchSubmit}>
              <Input label="Tipo" as="select" name="traderType" value={search.traderType} onChange={(event) => setSearch((current) => ({ ...current, traderType: event.target.value }))} className="bg-slate-950">
                {traderTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </Input>
              <Input label="Buscar ativo" name="traderQuery" value={search.traderQuery} onChange={(event) => setSearch((current) => ({ ...current, traderQuery: event.target.value }))} placeholder="Digite nome ou ticker" required />
              <Button type="submit" disabled={loading}>{loading ? 'Buscando...' : 'Buscar'}</Button>
            </form>

            <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end" autoComplete="off" onSubmit={handlePeriodSubmit}>
              <div className="flex flex-wrap gap-2 md:col-span-3">
                {Object.keys(presets).map((preset) => (
                  <Button key={preset} type="button" variant={period.preset === preset ? 'primary' : 'secondary'} className="h-10 text-xs" onClick={() => applyPreset(preset)}>
                    {preset}
                  </Button>
                ))}
              </div>
              <Input label="Data inicial" name="from" type="date" value={period.from} onChange={(event) => setPeriod((current) => ({ ...current, from: event.target.value }))} required />
              <Input label="Data final" name="to" type="date" value={period.to} onChange={(event) => setPeriod((current) => ({ ...current, to: event.target.value }))} required />
              <Button type="submit" variant="accent" disabled={loading}>Aplicar periodo</Button>
            </form>

            <p className="min-h-6 text-sm text-zinc-400">{status}</p>
            <SelectedAssets assets={selectedAssets} activeAssetId={activeAssetId} setActiveAssetId={setActiveAssetId} remove={(asset) => toggleAsset(asset, false)} />
            <TraderResults results={results} selectedIds={selectedIds} toggleAsset={toggleAsset} />
          </div>
        </Card>

        <Card title="Grafico" description="Candles da sessao trader">
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(7,19,36,0.98),rgba(4,10,21,0.98))] p-4 shadow-[0_18px_80px_rgba(0,0,0,0.35)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">Pulse Trader</p>
                  <h2 className="mt-2 text-lg font-semibold text-white">Candles do ativo selecionado</h2>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-zinc-400">
                  Intraday quando a API responder
                </div>
              </div>
              <div className="h-[62vh] min-h-[420px]">
                <CandleChart assets={selectedAssets} activeAssetId={activeAssetId} />
              </div>
            </div>
            <TraderLegend assets={selectedAssets} />
          </div>
        </Card>
      </section>
    </AppLayout>
  )
}

function SelectedAssets({ assets, activeAssetId, setActiveAssetId, remove }) {
  if (!assets.length) {
    return <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 p-5 text-sm text-zinc-400">Nenhum ativo selecionado ainda.</div>
  }

  return (
    <div className="flex flex-wrap gap-3">
      {assets.map((asset) => (
        <div key={asset.id} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${asset.id === activeAssetId ? 'border-cyan-300/45 bg-cyan-400/10' : 'border-white/10 bg-white/5'}`}>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-white">{asset.name}</p>
              <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${TYPE_BADGES[asset.type] || 'bg-white/10 text-zinc-200'}`}>{asset.type}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">{asset.symbol}</p>
          </div>
          <Button type="button" variant={asset.id === activeAssetId ? 'primary' : 'accent'} className="h-9 px-3 text-xs" onClick={() => setActiveAssetId(asset.id)}>
            {asset.id === activeAssetId ? 'Ativo' : 'Abrir'}
          </Button>
          <Button type="button" variant="danger" className="h-9 px-3 text-xs" onClick={() => remove(asset)}>
            Remover
          </Button>
        </div>
      ))}
    </div>
  )
}

function TraderResults({ results, selectedIds, toggleAsset }) {
  if (!results.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 p-6 text-sm text-zinc-400">
        Busque um ativo por nome ou ticker para montar o painel trader.
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {results.map((asset) => {
        const checked = selectedIds.includes(asset.id)
        return (
          <label key={asset.id} className={`flex cursor-pointer items-start gap-3 rounded-3xl border p-4 transition hover:border-cyan-300/35 hover:bg-white/6 ${checked ? 'border-cyan-300/45 bg-cyan-400/10' : 'border-white/10 bg-white/4'}`}>
            <input type="checkbox" name="trader-assets" value={asset.id} checked={checked} onChange={(event) => toggleAsset(asset, event.target.checked)} className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-300" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-white">{asset.name}</p>
                <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${TYPE_BADGES[asset.type] || 'bg-white/10 text-zinc-200'}`}>{asset.type}</span>
              </div>
              <p className="mt-2 text-xs text-zinc-400">{asset.symbol} - {asset.source}</p>
            </div>
          </label>
        )
      })}
    </div>
  )
}
