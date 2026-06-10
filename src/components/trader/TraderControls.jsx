import FormField from '@/components/ui/form-field.jsx'
import { Button } from '@/components/ui/button'

export default function TraderControls({
  search,
  setSearch,
  period,
  setPeriod,
  presets,
  loading,
  onSearchSubmit,
  onPeriodSubmit,
  onPreset,
}) {
  return (
    <div className="space-y-5">
      <form className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end" autoComplete="off" onSubmit={onSearchSubmit}>
        <FormField label="Tipo" as="select" name="traderType" value={search.traderType} onChange={(event) => setSearch((current) => ({ ...current, traderType: event.target.value }))}>
          {['Ações', 'FIIs', 'BDRs', 'ETFs', 'Ações Internacionais', 'Criptomoedas'].map((type) => <option key={type} value={type}>{type}</option>)}
        </FormField>
        <FormField label="Buscar ativo" name="traderQuery" value={search.traderQuery} onChange={(event) => setSearch((current) => ({ ...current, traderQuery: event.target.value }))} placeholder="Digite nome ou ticker" required />
        <Button type="submit" size="lg" disabled={loading}>{loading ? 'Buscando...' : 'Buscar'}</Button>
      </form>

      <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end" autoComplete="off" onSubmit={onPeriodSubmit}>
        <div className="flex flex-wrap gap-2 md:col-span-3">
          {Object.keys(presets).map((preset) => (
            <Button key={preset} type="button" variant={period.preset === preset ? 'default' : 'outline'} size="lg" onClick={() => onPreset(preset)}>
              {preset}
            </Button>
          ))}
        </div>
        <FormField label="Data inicial" name="from" type="date" value={period.from} onChange={(event) => setPeriod((current) => ({ ...current, from: event.target.value }))} required />
        <FormField label="Data final" name="to" type="date" value={period.to} onChange={(event) => setPeriod((current) => ({ ...current, to: event.target.value }))} required />
        <Button type="submit" variant="secondary" size="lg" disabled={loading}>Aplicar periodo</Button>
      </form>
    </div>
  )
}
