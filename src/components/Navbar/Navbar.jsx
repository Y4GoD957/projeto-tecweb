import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/trader', label: 'Trader' },
]

export default function Navbar() {
  return (
    <nav className="inline-flex rounded-2xl border border-white/10 bg-slate-950/45 p-1">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition ${
              isActive
                ? 'bg-white text-slate-950 shadow-[0_8px_30px_rgba(255,255,255,0.12)]'
                : 'text-zinc-300 hover:bg-white/6 hover:text-white'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
