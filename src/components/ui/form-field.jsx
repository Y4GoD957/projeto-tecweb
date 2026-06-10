import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export default function FormField({
  label,
  error,
  hint,
  as = 'input',
  children,
  className,
  id,
  name,
  ...props
}) {
  const fieldId = id || name
  const Component = as === 'select' ? 'select' : Input

  return (
    <div className="space-y-2">
      {label ? <Label htmlFor={fieldId}>{label}</Label> : null}
      <Component
        id={fieldId}
        name={name}
        aria-invalid={Boolean(error)}
        className={cn(
          'h-11 rounded-xl border-white/10 bg-slate-950/55 text-white placeholder:text-zinc-600 focus-visible:ring-cyan-300/35',
          as === 'select' && 'w-full border px-3 py-2 text-sm outline-none transition focus:border-cyan-300/50',
          className,
        )}
        {...props}
      >
        {children}
      </Component>
      {hint ? <p className="text-xs leading-5 text-zinc-500">{hint}</p> : null}
      {error ? <p className="text-xs leading-5 text-rose-300">{error}</p> : null}
    </div>
  )
}
