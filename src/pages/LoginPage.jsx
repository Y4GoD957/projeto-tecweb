import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import FormField from '@/components/ui/form-field.jsx'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [feedback, setFeedback] = useState('')

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFeedback('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    const result = login(form)
    if (!result.ok) {
      setFeedback(result.message)
      return
    }

    setFeedback('Redirecionando para o dashboard...')
    navigate(location.state?.from || '/inicio', { replace: true })
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#123255_0%,#08111f_45%,#050816_100%)] px-4 py-10 text-zinc-100">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-8 shadow-[0_24px_120px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),transparent_35%,rgba(249,115,22,0.12)_78%,transparent)]" />
          <div className="relative">
            <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-100">Pulse Invest</Badge>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Gestao de investimentos com base simples, clara e pronta para evoluir.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
              Login local, persistencia por usuario, dashboard, distribuicao por categoria e cotacoes com fallback resiliente.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ['Login local', 'Sessao persistida com validacao basica.'],
                ['Dashboard', 'Resumo patrimonial e grafico por categoria.'],
                ['Servicos', 'Camadas separadas para storage, API e UI.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardDescription>Acesso</CardDescription>
            <CardTitle>Entrar ou criar conta local</CardTitle>
            <p className="text-sm leading-6 text-zinc-400">
              Use qualquer e-mail valido e uma senha com pelo menos 6 caracteres.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" autoComplete="off" onSubmit={handleSubmit}>
            <FormField
              label="E-mail"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="voce@exemplo.com"
              required
            />
            <FormField
              label="Senha"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="********"
              required
              minLength="6"
            />
            <Button type="submit" size="lg" className="w-full">
              <LogIn aria-hidden="true" className="size-4" />
              Continuar
            </Button>
            <p className="min-h-6 text-sm text-zinc-400">{feedback}</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
