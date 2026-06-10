import { useEffect, useRef } from 'react'
import { CHART_COLORS } from '../../lib/constants'
import { formatCurrency } from '../../lib/utils'

export default function CandleChart({ assets, activeAssetId }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const activeAsset = assets.find((asset) => asset.id === activeAssetId) || assets[0]
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth || 1200
    const height = canvas.clientHeight || 620
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#071321'
    ctx.fillRect(0, 0, width, height)

    if (!activeAsset?.series?.candles?.length) {
      ctx.fillStyle = 'rgba(228,228,231,0.85)'
      ctx.font = '600 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Serie indisponivel para o periodo selecionado', width / 2, height / 2 - 8)
      ctx.fillStyle = 'rgba(161,161,170,0.78)'
      ctx.font = '13px sans-serif'
      ctx.fillText('Ajuste o intervalo ou selecione outro ativo.', width / 2, height / 2 + 20)
      return
    }

    const candles = activeAsset.series.candles
    const prices = candles.flatMap((candle) => [candle.high, candle.low])
    const maxPrice = Math.max(...prices)
    const minPrice = Math.min(...prices)
    const range = Math.max(maxPrice - minPrice, 0.0001)
    const padding = { top: 24, right: 88, bottom: 48, left: 20 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom
    const step = chartWidth / candles.length
    const candleWidth = Math.max(Math.min(step * 0.42, 16), 5)
    const toY = (price) => padding.top + ((maxPrice - price) / range) * chartHeight

    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i += 1) {
      const y = padding.top + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    ctx.font = '12px sans-serif'
    ctx.fillStyle = 'rgba(228,228,231,0.72)'
    ctx.textAlign = 'left'
    ctx.fillText(`${activeAsset.name} (${activeAsset.symbol})`, padding.left, 16)
    ctx.textAlign = 'right'
    ctx.fillText(activeAsset.quoteSourceLabel || activeAsset.source || 'API', width - padding.right, 16)

    for (let i = 0; i <= 5; i += 1) {
      const ratio = i / 5
      const price = maxPrice - range * ratio
      const y = padding.top + chartHeight * ratio
      ctx.fillStyle = 'rgba(228,228,231,0.64)'
      ctx.textAlign = 'left'
      ctx.fillText(formatCurrency(price), width - padding.right + 12, y + 4)
    }

    candles.forEach((candle, index) => {
      const x = padding.left + step * index + step / 2
      const openY = toY(candle.open)
      const closeY = toY(candle.close)
      const highY = toY(candle.high)
      const lowY = toY(candle.low)
      const previousClose = Number(candles[Math.max(index - 1, 0)]?.close || candle.open)
      const positive = index === 0 ? candle.close >= candle.open : candle.close >= previousClose
      const color = positive ? '#34d399' : '#fb7185'

      ctx.strokeStyle = color
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()

      const bodyTop = Math.min(openY, closeY)
      const bodyHeight = Math.max(Math.abs(closeY - openY), 2)
      ctx.fillStyle = color
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight)
    })

    const labelStep = Math.max(Math.floor(candles.length / 8), 1)
    ctx.fillStyle = 'rgba(228,228,231,0.64)'
    ctx.textAlign = 'center'
    candles.forEach((candle, index) => {
      if (index % labelStep !== 0 && index !== candles.length - 1) return
      const x = padding.left + step * index + step / 2
      ctx.fillText(candle.label, x, height - 18)
    })
  }, [assets, activeAssetId])

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full"
      aria-label="Grafico candle do ativo selecionado"
    />
  )
}

export function TraderLegend({ assets }) {
  if (!assets.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/4 p-5 text-sm text-zinc-400">
        Escolha um ativo para exibir o candle chart.
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {assets.map((asset, index) => (
        <div key={asset.id} className="rounded-3xl border border-white/10 bg-white/4 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
              <div>
                <p className="text-sm font-medium text-white">{asset.name}</p>
                <p className="text-xs text-zinc-400">{asset.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">{asset.quoteSourceLabel || asset.source}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Abertura" value={asset.periodOpen > 0 ? formatCurrency(asset.periodOpen) : 'Indisponivel'} />
            <Metric label="Fechamento" value={asset.periodClose > 0 ? formatCurrency(asset.periodClose) : 'Indisponivel'} />
            <Metric label="Maxima" value={asset.periodHigh > 0 ? formatCurrency(asset.periodHigh) : 'Indisponivel'} />
            <Metric label="Minima" value={asset.periodLow > 0 ? formatCurrency(asset.periodLow) : 'Indisponivel'} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">{label}</p>
      <p className="mt-2 break-all text-lg font-semibold text-white">{value}</p>
    </div>
  )
}
