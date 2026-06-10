import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { ClipboardList, LineChart, PlusCircle, WalletCards } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout.jsx'
import SummaryCard from '@/components/portfolio/SummaryCard.jsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext.jsx'
import { usePortfolio } from '@/context/PortfolioContext.jsx'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { getSummary } from '@/utils/portfolio'

export default function InicioPage() {
  const { user } = useAuth()
  const { assets, hydratePortfolio } = usePortfolio()
  const summary = getSummary(assets)

  useEffect(() => {
    hydratePortfolio(user)
  }, [user?.email])

  return (
    <AppLayout
      eyebrow="Início"
      title="Painel inicial da carteira"
      description="Acesse rapidamente o cadastro, a listagem e a análise dos seus investimentos em uma navegação alinhada aos requisitos da atividade."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Ativos cadastrados" value={String(assets.length)} helper="Itens salvos no estado compartilhado da carteira." tone="cyan" />
        <SummaryCard label="Patrimônio total" value={formatCurrency(summary.totalValue)} helper="Soma atualizada com cotações ou fallback local." tone="emerald" />
        <SummaryCard label="Rentabilidade" value={formatPercent(summary.performance)} helper="Relação entre valor atual e capital investido." tone="amber" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <NavigationCard
          icon={PlusCircle}
          title="Cadastro"
          description="Registre novos ativos com formulário controlado, validação e persistência."
          to="/cadastro"
        />
        <NavigationCard
          icon={ClipboardList}
          title="Listagem"
          description="Visualize os ativos cadastrados a partir do estado compartilhado."
          to="/listagem"
        />
        <NavigationCard
          icon={WalletCards}
          title="Dashboard"
          description="Acompanhe distribuição, filtros e resumo patrimonial da carteira."
          to="/dashboard"
        />
        <NavigationCard
          icon={LineChart}
          title="Trader"
          description="Consulte ativos em APIs REST e analise candles por período."
          to="/trader"
        />
      </section>
    </AppLayout>
  )
}

function NavigationCard({ icon: Icon, title, description, to }) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-11 items-center justify-center rounded-xl border border-white/10 bg-cyan-400/10 text-cyan-100">
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <CardDescription>Acesso rápido</CardDescription>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-zinc-400">{description}</p>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link to={to}>Abrir</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
