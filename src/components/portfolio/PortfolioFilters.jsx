import FormField from '@/components/ui/form-field.jsx'
import { ASSET_TYPES } from '@/lib/constants'

export default function PortfolioFilters({ filters, setFilters, total, visible }) {
  function handleChange(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <FormField label="Tipo" as="select" name="type" value={filters.type} onChange={handleChange}>
        {['Todos', ...ASSET_TYPES].map((type) => <option key={type} value={type}>{type}</option>)}
      </FormField>
      <FormField label="Desempenho" as="select" name="performance" value={filters.performance} onChange={handleChange}>
        {['Todos', 'Positivos', 'Negativos', 'Neutros'].map((option) => <option key={option} value={option}>{option}</option>)}
      </FormField>
      <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-zinc-300">
        {visible} de {total} ativo(s)
      </div>
    </div>
  )
}
