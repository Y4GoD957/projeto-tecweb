import { ASSET_TYPES, ASSET_TYPE_RULES, TYPE_BADGES } from '../lib/constants'
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  getInitials,
  getVariationTone,
} from '../lib/utils'

function cardShell({ title, description, content, footer = '' }) {
  return `
    <section class="rounded-3xl border border-white/10 bg-white/6 p-6 shadow-[0_20px_80px_rgba(3,8,20,0.35)] backdrop-blur">
      <div class="mb-5 flex items-start justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.32em] text-zinc-400">${title}</p>
          <h2 class="mt-2 text-xl font-semibold text-white">${description}</h2>
        </div>
      </div>
      ${content}
      ${footer}
    </section>
  `
}

function renderSelectOptions(selectedValue) {
  return ASSET_TYPES.map(
    (type) => `<option value="${type}" ${selectedValue === type ? 'selected' : ''}>${type}</option>`,
  ).join('')
}

function getTypeRule(type) {
  return ASSET_TYPE_RULES[type] || ASSET_TYPE_RULES['Renda Fixa']
}

function renderFilters({ filters, totalAssetsCount, visibleAssetsCount }) {
  const typeOptions = ['Todos', ...ASSET_TYPES]
    .map(
      (type) =>
        `<option value="${type}" ${filters.type === type ? 'selected' : ''}>${type}</option>`,
    )
    .join('')

  const performanceOptions = ['Todos', 'Positivos', 'Negativos', 'Neutros']
    .map(
      (option) =>
        `<option value="${option}" ${filters.performance === option ? 'selected' : ''}>${option}</option>`,
    )
    .join('')

  return `
    <form id="filters-form" class="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <label class="block">
        <span class="mb-2 block text-sm text-zinc-300">Tipo</span>
        <select name="type" class="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-white outline-none transition focus:border-cyan-300/50">
          ${typeOptions}
        </select>
      </label>
      <label class="block">
        <span class="mb-2 block text-sm text-zinc-300">Desempenho</span>
        <select name="performance" class="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-white outline-none transition focus:border-cyan-300/50">
          ${performanceOptions}
        </select>
      </label>
      <div class="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-zinc-300">
        ${visibleAssetsCount} de ${totalAssetsCount} ativo(s)
      </div>
    </form>
  `
}

export function renderAuthView() {
  return `
    <main class="min-h-screen bg-[radial-gradient(circle_at_top,#123255_0%,#08111f_45%,#050816_100%)] px-4 py-10 text-zinc-100">
      <div class="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section class="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 p-8 shadow-[0_24px_120px_rgba(0,0,0,0.45)] backdrop-blur">
          <div class="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),transparent_35%,rgba(249,115,22,0.12)_78%,transparent)]"></div>
          <div class="relative">
            <span class="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium tracking-[0.24em] text-cyan-100 uppercase">
              Pulse Invest
            </span>
            <h1 class="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Gestao de investimentos com base simples, clara e pronta para evoluir.
            </h1>
            <p class="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
              Estrutura inicial com login, persistencia local por usuario, dashboard, distribuicao por categoria e
              integracao com cotacoes com fallback resiliente.
            </p>
            <div class="mt-10 grid gap-4 sm:grid-cols-3">
              ${[
                ['Login local', 'Sessao persistida com validacao basica.'],
                ['Dashboard', 'Resumo patrimonial e grafico por categoria.'],
                ['Evolucao futura', 'Camadas separadas para storage, API e UI.'],
              ]
                .map(
                  ([title, text]) => `
                    <div class="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                      <p class="text-sm font-medium text-white">${title}</p>
                      <p class="mt-2 text-sm leading-6 text-zinc-400">${text}</p>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </div>
        </section>

        <section class="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_120px_rgba(0,0,0,0.42)]">
          <div class="mb-6">
            <p class="text-xs uppercase tracking-[0.28em] text-zinc-500">Acesso</p>
            <h2 class="mt-2 text-2xl font-semibold text-white">Entrar ou criar conta local</h2>
            <p class="mt-2 text-sm leading-6 text-zinc-400">
              Use qualquer e-mail valido e uma senha com pelo menos 6 caracteres.
            </p>
          </div>
          <form id="login-form" class="space-y-4">
            <label class="block">
              <span class="mb-2 block text-sm text-zinc-300">E-mail</span>
              <input
                name="email"
                type="email"
                class="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-cyan-300/50"
                placeholder="voce@exemplo.com"
                required
              />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm text-zinc-300">Senha</span>
              <input
                name="password"
                type="password"
                class="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-cyan-300/50"
                placeholder="********"
                required
                minlength="6"
              />
            </label>
            <button
              type="submit"
              class="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white px-4 font-medium text-slate-950 transition hover:bg-cyan-100"
            >
              Continuar
            </button>
            <p id="auth-feedback" class="min-h-6 text-sm text-zinc-400"></p>
          </form>
        </section>
      </div>
    </main>
  `
}

function renderSummaryCard(label, value, helper) {
  return `
    <div class="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
      <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">${label}</p>
      <p class="mt-3 text-3xl font-semibold tracking-tight text-white">${value}</p>
      <p class="mt-2 text-sm text-zinc-400">${helper}</p>
    </div>
  `
}

function renderQuoteStatus(asset) {
  const description = asset.isFallbackQuote
    ? 'Estimativa local usada quando a API nao retorna cotacao valida.'
    : 'Cotacao carregada por provedor externo.'

  return `
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${asset.quoteBadgeClass}">
        ${asset.quoteSourceLabel}
      </span>
      <span class="text-xs text-zinc-500">Atualizado em ${formatDateTime(asset.quoteUpdatedAt)}</span>
      <span class="basis-full text-xs text-zinc-500">${description}</span>
    </div>
  `
}

function renderAssetRows(assets) {
  if (!assets.length) {
    return `
      <div class="rounded-3xl border border-dashed border-white/10 bg-white/4 p-8 text-center">
        <p class="text-lg font-medium text-white">Nenhum ativo encontrado</p>
        <p class="mt-2 text-sm text-zinc-400">Ajuste os filtros ou cadastre um novo ativo.</p>
      </div>
    `
  }

  return `
    <div class="space-y-3">
      ${assets
        .map((asset) => {
          const badgeClass = TYPE_BADGES[asset.type] || 'bg-white/10 text-zinc-200'
          const totalValue = asset.marketValue || 0
          return `
            <article class="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/35 p-4 lg:grid-cols-[1.2fr_0.9fr_0.8fr_0.7fr_auto] lg:items-center">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-lg font-medium text-white">${asset.name}</h3>
                  <span class="rounded-full px-3 py-1 text-xs font-medium ${badgeClass}">${asset.type}</span>
                  <span class="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">${asset.symbol}</span>
                </div>
                <p class="mt-2 text-sm text-zinc-400">
                  Quantidade ${asset.quantity} • Preco medio ${formatCurrency(asset.averagePrice)}
                </p>
                ${renderQuoteStatus(asset)}
              </div>
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">Preco atual</p>
                <p class="mt-2 text-lg font-medium text-white">${formatCurrency(asset.currentPrice)}</p>
                <p class="mt-1 text-sm text-zinc-400">Fonte: ${asset.quoteSourceLabel}</p>
              </div>
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">Valor atual</p>
                <p class="mt-2 text-lg font-medium text-white">${formatCurrency(totalValue)}</p>
              </div>
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">Variacao</p>
                <p class="mt-2 text-lg font-medium ${getVariationTone(asset.variation)}">${formatPercent(asset.variation)}</p>
              </div>
              <div class="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  data-action="start-edit"
                  data-asset-id="${asset.id}"
                  class="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/6"
                >
                  Editar
                </button>
                <button
                  type="button"
                  data-action="delete-asset"
                  data-asset-id="${asset.id}"
                  class="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-400/20 px-4 text-sm font-medium text-rose-200 transition hover:bg-rose-400/10"
                >
                  Remover
                </button>
              </div>
            </article>
          `
        })
        .join('')}
    </div>
  `
}

export function renderDashboardView({
  user,
  summary,
  assets,
  totalAssetsCount,
  filters,
  editingAsset,
}) {
  const initial = getInitials(user.email)
  const selectedType = editingAsset?.type || ASSET_TYPES[0]
  const typeRule = getTypeRule(selectedType)
  const summaryCards = [
    ['Patrimonio total', formatCurrency(summary.totalValue), 'Atualizado com o ultimo preco disponivel.'],
    ['Capital investido', formatCurrency(summary.totalInvested), 'Soma do preco medio ponderado por quantidade.'],
    ['Rentabilidade', formatPercent(summary.performance), 'Diferenca entre patrimonio atual e custo total.'],
  ]

  const summaryGrid = `
    <section class="grid gap-4 md:grid-cols-3">
      ${summaryCards.map((card) => renderSummaryCard(...card)).join('')}
    </section>
  `

  const portfolioForm = cardShell({
    title: editingAsset ? 'Editar ativo' : 'Novo ativo',
    description: editingAsset ? 'Ajustar posicao atual' : 'Cadastrar posicao',
    content: `
      <form id="asset-form" class="grid gap-4 md:grid-cols-2">
        <label class="block">
          <span class="mb-2 block text-sm text-zinc-300">Nome do ativo</span>
          <input name="name" type="text" value="${editingAsset?.name || ''}" required class="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-cyan-300/50" placeholder="Tesouro Selic 2029" />
        </label>
        <label class="block">
          <span class="mb-2 block text-sm text-zinc-300">Ticker / Codigo</span>
          <input id="asset-symbol" name="symbol" type="text" value="${editingAsset?.symbol || ''}" required class="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 uppercase text-white outline-none transition focus:border-cyan-300/50" placeholder="${typeRule.symbolPlaceholder}" />
          <p id="asset-symbol-hint" class="mt-2 text-xs leading-5 text-zinc-500">${typeRule.symbolHint}</p>
        </label>
        <label class="block">
          <span class="mb-2 block text-sm text-zinc-300">Tipo</span>
          <select id="asset-type" name="type" required class="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-white outline-none transition focus:border-cyan-300/50">
            ${renderSelectOptions(editingAsset?.type)}
          </select>
        </label>
        <label class="block">
          <span class="mb-2 block text-sm text-zinc-300">Quantidade</span>
          <input name="quantity" type="number" min="0.0001" step="0.0001" value="${editingAsset?.quantity ?? ''}" required class="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-cyan-300/50" placeholder="10" />
        </label>
        <label class="block md:col-span-2">
          <span class="mb-2 block text-sm text-zinc-300">Preco medio (BRL)</span>
          <input name="averagePrice" type="number" min="0.01" step="0.01" value="${editingAsset?.averagePrice ?? ''}" required class="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-cyan-300/50" placeholder="100.50" />
        </label>
        <button type="submit" class="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-4 font-medium text-slate-950 transition hover:bg-cyan-100">
          ${editingAsset ? 'Salvar ativo' : 'Adicionar ativo'}
        </button>
        <button type="button" data-action="refresh-quotes" class="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 px-4 font-medium text-white transition hover:bg-white/6">
          Atualizar cotacoes
        </button>
        ${
          editingAsset
            ? `
              <button type="button" data-action="cancel-edit" class="inline-flex h-12 items-center justify-center rounded-2xl border border-amber-400/20 px-4 font-medium text-amber-100 transition hover:bg-amber-400/10 md:col-span-2">
                Cancelar edicao
              </button>
            `
            : ''
        }
      </form>
      <p id="portfolio-feedback" class="mt-4 min-h-6 text-sm text-zinc-400"></p>
    `,
  })

  const chartCard = cardShell({
    title: 'Distribuicao',
    description: 'Carteira por categoria',
    content: `
      <div class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
        <div class="mx-auto aspect-square max-w-[280px]">
          <canvas id="allocation-chart" aria-label="Distribuicao da carteira por categoria"></canvas>
        </div>
        <div id="allocation-legend" class="grid gap-3"></div>
      </div>
    `,
  })

  const assetsCard = cardShell({
    title: 'Carteira',
    description: 'Ativos cadastrados',
    content: `
      <div class="space-y-5">
        ${renderFilters({
          filters,
          totalAssetsCount,
          visibleAssetsCount: assets.length,
        })}
        ${renderAssetRows(assets)}
      </div>
    `,
  })

  return `
    <main class="min-h-screen bg-[radial-gradient(circle_at_top,#0f2748_0%,#08111f_42%,#050816_100%)] px-4 py-6 text-zinc-100">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_20px_80px_rgba(3,8,20,0.35)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.32em] text-zinc-500">Dashboard</p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Ola, ${user.email}</h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Acompanhe patrimonio, distribuicao e ativos da sua carteira em uma base preparada para futura integracao com backend.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/50 text-sm font-semibold text-white">${initial}</div>
            <button type="button" data-action="logout" class="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 px-4 font-medium text-white transition hover:bg-white/6">
              Sair
            </button>
          </div>
        </header>

        ${summaryGrid}

        <section class="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          ${portfolioForm}
          ${chartCard}
        </section>

        ${assetsCard}
      </div>
    </main>
  `
}

export function renderLegend(items) {
  if (!items.length) {
    return `
      <div class="rounded-2xl border border-dashed border-white/10 bg-white/4 p-5 text-sm text-zinc-400">
        O grafico sera preenchido apos o cadastro do primeiro ativo.
      </div>
    `
  }

  return items
    .map(
      (item) => `
        <div class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
          <div class="flex items-center gap-3">
            <span class="h-3 w-3 rounded-full" style="background:${item.color}"></span>
            <div>
              <p class="text-sm font-medium text-white">${item.label}</p>
              <p class="text-xs text-zinc-400">${item.assetCount} ativo(s)</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium text-white">${formatCurrency(item.value)}</p>
            <p class="text-xs text-zinc-400">${formatPercent(item.share)}</p>
          </div>
        </div>
      `,
    )
    .join('')
}
