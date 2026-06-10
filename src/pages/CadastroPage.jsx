import AppLayout from '@/components/layout/AppLayout.jsx'
import AssetForm from '@/components/portfolio/AssetForm.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAssetForm } from '@/hooks/useAssetForm'

export default function CadastroPage() {
  const assetForm = useAssetForm()

  return (
    <AppLayout
      eyebrow="Cadastro"
      title="Cadastro de ativos"
      description="Registre ativos financeiros com formulário controlado, validação por tipo e autopreenchimento quando a API responder."
    >
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardDescription>Formulário controlado</CardDescription>
            <CardTitle>{assetForm.editingId ? 'Editar ativo' : 'Novo ativo'}</CardTitle>
          </CardHeader>
          <CardContent>
            <AssetForm
              editingId={assetForm.editingId}
              form={assetForm.form}
              symbolRule={assetForm.symbolRule}
              symbolError={assetForm.symbolError}
              providers={assetForm.providers}
              autofillStatus={assetForm.autofillStatus}
              feedback={assetForm.feedback}
              error={assetForm.error}
              loading={assetForm.loading}
              onChange={assetForm.handleFormChange}
              onSubmit={assetForm.handleSubmit}
              onAutofill={assetForm.handleAutofill}
              onRefresh={assetForm.refreshPortfolio}
              onCancel={assetForm.resetForm}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Validação e eventos</CardDescription>
            <CardTitle>Como o cadastro funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-zinc-400">
            <p>Todos os campos são controlados por estado React e atualizados com `onChange`.</p>
            <p>O envio usa `onSubmit` com `preventDefault()` e valida nome, ticker, tipo, quantidade e valor de mercado.</p>
            <p>Após salvar, o ativo entra no Context API da carteira e aparece automaticamente na página de Listagem.</p>
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  )
}
