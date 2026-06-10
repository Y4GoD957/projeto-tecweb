import { Badge } from '@/components/ui/badge'
import { TYPE_BADGES } from '@/lib/constants'

export default function TraderResults({ results, selectedIds, toggleAsset }) {
  if (!results.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/4 p-6 text-sm text-zinc-400">
        Busque um ativo por nome ou ticker para montar o painel trader.
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {results.map((asset) => {
        const checked = selectedIds.includes(asset.id)
        return (
          <label key={asset.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition hover:border-cyan-300/35 hover:bg-white/6 ${checked ? 'border-cyan-300/45 bg-cyan-400/10' : 'border-white/10 bg-white/4'}`}>
            <input type="checkbox" name="trader-assets" value={asset.id} checked={checked} onChange={(event) => toggleAsset(asset, event.target.checked)} className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-300" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-white">{asset.name}</p>
                <Badge className={TYPE_BADGES[asset.type] || 'bg-white/10 text-zinc-200'}>{asset.type}</Badge>
              </div>
              <p className="mt-2 text-xs text-zinc-400">{asset.symbol} - {asset.source}</p>
            </div>
          </label>
        )
      })}
    </div>
  )
}
