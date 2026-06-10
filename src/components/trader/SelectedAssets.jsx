import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TYPE_BADGES } from '@/lib/constants'

export default function SelectedAssets({ assets, activeAssetId, setActiveAssetId, remove }) {
  if (!assets.length) {
    return <div className="rounded-2xl border border-dashed border-white/10 bg-white/4 p-5 text-sm text-zinc-400">Nenhum ativo selecionado ainda.</div>
  }

  return (
    <div className="flex flex-wrap gap-3">
      {assets.map((asset) => (
        <div key={asset.id} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${asset.id === activeAssetId ? 'border-cyan-300/45 bg-cyan-400/10' : 'border-white/10 bg-white/5'}`}>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-white">{asset.name}</p>
              <Badge className={TYPE_BADGES[asset.type] || 'bg-white/10 text-zinc-200'}>{asset.type}</Badge>
            </div>
            <p className="mt-1 text-xs text-zinc-400">{asset.symbol}</p>
          </div>
          <Button type="button" variant={asset.id === activeAssetId ? 'default' : 'secondary'} size="sm" onClick={() => setActiveAssetId(asset.id)}>
            {asset.id === activeAssetId ? 'Ativo' : 'Abrir'}
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={() => remove(asset)}>
            Remover
          </Button>
        </div>
      ))}
    </div>
  )
}
