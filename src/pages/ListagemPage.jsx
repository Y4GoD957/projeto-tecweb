import { useEffect, useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout.jsx'
import AssetList from '@/components/portfolio/AssetList.jsx'
import PortfolioFilters from '@/components/portfolio/PortfolioFilters.jsx'
import SummaryCard from '@/components/portfolio/SummaryCard.jsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext.jsx'
import { usePortfolio } from '@/context/PortfolioContext.jsx'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { getSummary } from '@/utils/portfolio'

export default function ListagemPage() {
  const { user } = useAuth()
  const { assets, loading, error, hydratePortfolio, refreshPortfolio, savePortfolio } = usePortfolio()
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

  async function deleteAsset(assetId) {
    const nextPortfolio = (user.portfolio || []).filter((asset) => asset.id !== assetId)
    await savePortfolio(nextPortfolio)
  }

  return (
    <AppLayout
      eyebrow="Listagem"
      title="Listagem dinâmica de ativos"
      description="Os ativos cadastrados são carregados do estado compartilhado e persistidos por usuário no LocalStorage."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Itens exibidos" value={String(filteredAssets.length)} helper="Lista reativa conforme cadastro e filtros." tone="cyan" />
        <SummaryCard label="Patrimônio filtrado" value={formatCurrency(summary.totalValue)} helper="Total dos ativos atualmente visíveis." tone="emerald" />
        <SummaryCard label="Rentabilidade filtrada" value={formatPercent(summary.performance)} helper="Desempenho dos itens renderizados." tone="amber" />
      </section>

      <Card>
        <CardHeader>
          <CardDescription>Dados compartilhados</CardDescription>
          <CardTitle>Ativos cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <PortfolioFilters filters={filters} setFilters={setFilters} total={assets.length} visible={filteredAssets.length} />
            </div>
            <Button type="button" variant="outline" size="lg" onClick={refreshPortfolio} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar cotações'}
            </Button>
          </div>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <AssetList assets={filteredAssets} onDelete={deleteAsset} showEdit={false} />
        </CardContent>
      </Card>
    </AppLayout>
  )
}
