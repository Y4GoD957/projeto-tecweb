import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Navbar from './Navbar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getInitials } from '../../lib/utils'

export default function AppLayout({ eyebrow, title, description, children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f2748_0%,#08111f_42%,#050816_100%)] px-4 py-6 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-card/80 p-5 shadow-[0_20px_80px_rgba(3,8,20,0.35)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Navbar />
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-950/50 text-sm font-semibold text-white">
              {getInitials(user?.email)}
            </div>
            <Button type="button" variant="outline" size="lg" onClick={handleLogout}>
              <LogOut aria-hidden="true" className="size-4" />
              Sair
            </Button>
          </div>
        </header>
        {children}
      </div>
    </main>
  )
}
