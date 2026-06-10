import { useMemo, useState } from 'react'
import CandleChart, { TraderLegend } from '@/components/charts/CandleChart.jsx'
import AppLayout from '@/components/layout/AppLayout.jsx'
import SelectedAssets from '@/components/trader/SelectedAssets.jsx'
import TraderControls from '@/components/trader/TraderControls.jsx'
import TraderResults from '@/components/trader/TraderResults.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QUOTE_SOURCE_META } from '../lib/constants'
import { fetchAssetQuote, fetchTraderSeries, searchTraderAssets } from '../services/market'
import { sanitizeText } from '../lib/utils'

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
        <Card>
          <CardHeader>
            <CardDescription>Busca de mercado e graficos por ativo</CardDescription>
            <CardTitle>Painel Trader</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
              <p className="text-sm text-zinc-300">
                Busque ativos direto nas APIs de mercado. Selecione um ou mais, e abra o ativo desejado para ver o candle chart.
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.28em] text-zinc-500">
                {selectedAssets.length} ativo(s) selecionado(s)
              </p>
            </div>

            <TraderControls
              search={search}
              setSearch={setSearch}
              period={period}
              setPeriod={setPeriod}
              presets={presets}
              loading={loading}
              onSearchSubmit={handleSearchSubmit}
              onPeriodSubmit={handlePeriodSubmit}
              onPreset={applyPreset}
            />

            <p className="min-h-6 text-sm text-zinc-400">{status}</p>
            <SelectedAssets assets={selectedAssets} activeAssetId={activeAssetId} setActiveAssetId={setActiveAssetId} remove={(asset) => toggleAsset(asset, false)} />
            <TraderResults results={results} selectedIds={selectedIds} toggleAsset={toggleAsset} />
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Candles da sessao trader</CardDescription>
            <CardTitle>Grafico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
            <div className="rounded-2xl border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(7,19,36,0.98),rgba(4,10,21,0.98))] p-4 shadow-[0_18px_80px_rgba(0,0,0,0.35)]">
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
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  )
}
