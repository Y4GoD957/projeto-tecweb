import { NavLink } from 'react-router-dom'
import { CandlestickChart, ClipboardList, Home, PlusCircle, WalletCards } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/inicio', label: 'Início', Icon: Home },
  { to: '/cadastro', label: 'Cadastro', Icon: PlusCircle },
  { to: '/listagem', label: 'Listagem', Icon: ClipboardList },
  { to: '/dashboard', label: 'Dashboard', Icon: WalletCards },
  { to: '/trader', label: 'Trader', Icon: CandlestickChart },
]

export default function Navbar() {
  return (
    <nav className="flex flex-wrap rounded-xl border border-white/10 bg-slate-950/45 p-1">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-medium transition sm:px-4',
              isActive
                ? 'bg-white text-slate-950 shadow-[0_8px_30px_rgba(255,255,255,0.12)]'
                : 'text-zinc-300 hover:bg-white/6 hover:text-white',
            )
          }
        >
          <Icon aria-hidden="true" className="mr-2 size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
