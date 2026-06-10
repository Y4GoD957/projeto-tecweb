import { Check, RefreshCcw, X } from 'lucide-react'
import FormField from '@/components/ui/form-field.jsx'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ASSET_TYPES } from '@/lib/constants'

export default function AssetForm({
  editingId,
  form,
  symbolRule,
  symbolError,
  providers,
  autofillStatus,
  feedback,
  error,
  loading,
  onChange,
  onSubmit,
  onAutofill,
  onRefresh,
  onCancel,
}) {
  const status = feedback || error

  return (
    <form className="grid gap-4 md:grid-cols-2" autoComplete="off" onSubmit={onSubmit}>
      <FormField label="Nome do ativo" name="name" value={form.name} onChange={onChange} onBlur={() => onAutofill('name')} placeholder="Tesouro Selic 2029" required />
      <FormField label="Ticker / Codigo" name="symbol" value={form.symbol} onChange={onChange} onBlur={() => onAutofill('symbol')} placeholder={symbolRule.symbolPlaceholder} hint={symbolRule.symbolHint} error={symbolError} required className="uppercase" />
      <FormField label="Tipo" as="select" name="type" value={form.type} onChange={onChange} required>
        {ASSET_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
      </FormField>
      <FormField label="Quantidade" name="quantity" type="number" min="0.0001" step="0.0001" value={form.quantity} onChange={onChange} placeholder="10" required />
      <FormField label="Valor atual de mercado (BRL)" name="marketValue" type="number" min="0.01" step="0.01" value={form.marketValue} onChange={onChange} placeholder="0.00" required />
      <input type="hidden" name="currentPrice" value={form.currentPrice} readOnly />
      <p className="min-h-5 text-xs leading-5 text-zinc-500 md:col-span-2">
        {autofillStatus || (providers.length ? `Autopreenchimento disponivel via ${providers.join(', ')}.` : 'Preenchimento manual para este tipo.')}
      </p>
      <Button type="submit" size="lg">
        <Check aria-hidden="true" className="size-4" />
        {editingId ? 'Salvar ativo' : 'Adicionar ativo'}
      </Button>
      <Button type="button" variant="outline" size="lg" onClick={onRefresh} disabled={loading}>
        <RefreshCcw aria-hidden="true" className="size-4" />
        {loading ? 'Atualizando...' : 'Atualizar cotacoes'}
      </Button>
      {editingId ? (
        <Button type="button" variant="secondary" size="lg" className="md:col-span-2" onClick={onCancel}>
          <X aria-hidden="true" className="size-4" />
          Cancelar edicao
        </Button>
      ) : null}
      {status ? (
        <Alert className="border-white/10 bg-slate-950/50 md:col-span-2">
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}
