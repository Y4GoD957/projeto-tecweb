export default function Input({
  label,
  error,
  hint,
  as = 'input',
  children,
  className = '',
  ...props
}) {
  const Component = as
  return (
    <label className="block">
      {label ? <span className="mb-2 block text-sm text-zinc-300">{label}</span> : null}
      <Component
        className={`h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-cyan-300/50 ${className}`}
        {...props}
      >
        {children}
      </Component>
      {hint ? <p className="mt-2 text-xs leading-5 text-zinc-500">{hint}</p> : null}
      {error ? <p className="mt-2 text-xs leading-5 text-rose-300">{error}</p> : null}
    </label>
  )
}
