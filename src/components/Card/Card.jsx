export default function Card({ title, description, children, className = '' }) {
  return (
    <section
      className={`rounded-3xl border border-white/10 bg-white/6 p-6 shadow-[0_20px_80px_rgba(3,8,20,0.35)] backdrop-blur ${className}`}
    >
      {(title || description) && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {title ? (
              <p className="text-xs uppercase tracking-[0.32em] text-zinc-400">{title}</p>
            ) : null}
            {description ? <h2 className="mt-2 text-xl font-semibold text-white">{description}</h2> : null}
          </div>
        </div>
      )}
      {children}
    </section>
  )
}
