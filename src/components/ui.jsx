export function SimTag({ children = 'Simulated', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-sim-bg px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sim-ink ${className}`}>
      {children}
    </span>
  )
}

export function Card({ title, hint, right = <SimTag />, className = '', children }) {
  return (
    <section className={`min-w-0 rounded-xl border border-black/10 bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,.04),0_4px_16px_rgba(0,0,0,.05)] ${className}`}>
      {title && (
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-2">{title}</h2>
          {right}
        </div>
      )}
      {hint && <p className="mb-3 mt-0.5 text-xs text-muted">{hint}</p>}
      {children}
    </section>
  )
}

const BTN = {
  default: 'border-black/10 bg-surface text-ink hover:bg-surface-2',
  primary: 'border-accent bg-accent text-white hover:brightness-110',
  danger: 'border-critical bg-surface text-critical hover:bg-surface-2',
}
export function Button({ variant = 'default', className = '', ...props }) {
  return (
    <button
      className={`cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-50 ${BTN[variant]} ${className}`}
      {...props}
    />
  )
}

export function Pill({ tone, children }) {
  const tones = {
    open: 'border-serious text-ink-2',
    fixed: 'border-good text-good-text',
  }
  return <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${tones[tone] || 'border-black/10 text-ink-2'}`}>{children}</span>
}

export function SevDot({ sev }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-ink-2">
      <i className="inline-block size-2 rounded-full" style={{ background: `var(--color-${sev.key})` }} />
      {sev.label}
    </span>
  )
}

export function SubHeading({ children, className = '' }) {
  return <div className={`mb-1.5 mt-3 text-xs font-bold uppercase tracking-wide text-ink-2 ${className}`}>{children}</div>
}
