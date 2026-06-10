import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TYPE_BADGES } from '@/lib/constants'
import { formatCurrency, formatDateTime, formatPercent, getVariationTone } from '@/lib/utils'

export default function AssetList({ assets, onEdit, onDelete, showEdit = true }) {
  if (!assets.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/4 p-8 text-center">
        <p className="text-lg font-medium text-white">Nenhum ativo encontrado</p>
        <p className="mt-2 text-sm text-zinc-400">Ajuste os filtros ou cadastre um novo ativo.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="hidden grid-cols-[1.35fr_0.8fr_0.7fr_auto] gap-4 border-b border-white/10 bg-slate-950/70 px-4 py-3 text-xs uppercase tracking-[0.18em] text-zinc-500 lg:grid">
        <span>Ativo</span>
        <span>Valor atual</span>
        <span>Variação</span>
        <span className="text-right">Ações</span>
      </div>
      <div className="divide-y divide-white/10 bg-slate-950/30">
        {assets.map((asset) => (
          <article key={asset.id} className="grid gap-4 p-4 lg:grid-cols-[1.35fr_0.8fr_0.7fr_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-base font-medium text-white">{asset.name}</h3>
                <Badge className={TYPE_BADGES[asset.type] || 'bg-white/10 text-zinc-200'}>{asset.type}</Badge>
                <Badge variant="outline">{asset.symbol}</Badge>
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
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 lg:hidden">Valor atual</p>
              <p className="mt-1 text-lg font-medium text-white">{formatCurrency(asset.marketValue)}</p>
              <p className="mt-1 text-sm text-zinc-400">Fonte: {asset.quoteSourceLabel}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 lg:hidden">Variação</p>
              <p className={`mt-1 text-lg font-medium ${getVariationTone(asset.variation)}`}>{formatPercent(asset.variation)}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {showEdit ? (
                <Button type="button" variant="outline" size="lg" onClick={() => onEdit(asset)}>
                  <Pencil aria-hidden="true" className="size-4" />
                  Editar
                </Button>
              ) : null}
              <Button type="button" variant="destructive" size="lg" onClick={() => onDelete(asset.id)}>
                <Trash2 aria-hidden="true" className="size-4" />
                Remover
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
