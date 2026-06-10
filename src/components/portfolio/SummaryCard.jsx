export default function SummaryCard({ label, value, helper, tone = 'cyan' }) {
  const tones = {
    cyan: 'from-cyan-400/18 to-sky-400/5 text-cyan-100',
    emerald: 'from-emerald-400/18 to-lime-400/5 text-emerald-100',
    amber: 'from-amber-400/18 to-orange-400/5 text-amber-100',
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${tones[tone]} p-5 shadow-lg shadow-slate-950/20`}>
      <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{helper}</p>
    </div>
  )
}
