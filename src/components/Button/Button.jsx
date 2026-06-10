const variants = {
  primary: 'bg-white text-slate-950 hover:bg-cyan-100',
  secondary: 'border border-white/10 text-white hover:bg-white/6',
  danger: 'border border-rose-400/20 text-rose-200 hover:bg-rose-400/10',
  accent: 'border border-cyan-300/30 text-cyan-100 hover:bg-cyan-400/10',
}

export default function Button({ children, className = '', variant = 'primary', ...props }) {
  return (
    <button
      className={`inline-flex h-12 items-center justify-center rounded-2xl px-4 font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
