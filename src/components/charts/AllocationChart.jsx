import Chart from 'chart.js/auto'
import { useEffect, useRef } from 'react'
import { formatCurrency, formatPercent } from '../../lib/utils'

export default function AllocationChart({ allocation }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !allocation.length) return undefined

    const chart = new Chart(canvasRef.current, {
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
                return `${context.label}: ${formatCurrency(context.raw)}`
              },
            },
          },
        },
      },
    })

    return () => chart.destroy()
  }, [allocation])

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
      <div className="mx-auto aspect-square w-full max-w-[280px]">
        {allocation.length ? (
          <canvas ref={canvasRef} aria-label="Distribuicao da carteira por categoria" />
        ) : (
          <div className="flex h-full items-center justify-center rounded-full border border-dashed border-white/10 text-center text-sm text-zinc-500">
            Sem dados
          </div>
        )}
      </div>
      <div className="grid gap-3">
        {allocation.length ? (
          allocation.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/4 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-zinc-400">{item.assetCount} ativo(s)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">{formatCurrency(item.value)}</p>
                <p className="text-xs text-zinc-400">{formatPercent(item.share)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/4 p-5 text-sm text-zinc-400">
            O grafico sera preenchido apos o cadastro do primeiro ativo.
          </div>
        )}
      </div>
    </div>
  )
}
