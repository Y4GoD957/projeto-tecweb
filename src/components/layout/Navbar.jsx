import { NavLink } from 'react-router-dom'
import { CandlestickChart, Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/dashboard', label: 'Dashboard', Icon: Gauge },
  { to: '/trader', label: 'Trader', Icon: CandlestickChart },
]

export default function Navbar() {
  return (
    <nav className="inline-flex rounded-xl border border-white/10 bg-slate-950/45 p-1">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition',
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
