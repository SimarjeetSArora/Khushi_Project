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
  good: 'border-good-text bg-good-text text-white hover:brightness-110',
  danger: 'border-critical bg-surface text-critical hover:bg-surface-2',
  ghost: 'border-transparent bg-transparent text-ink-2 hover:bg-surface-2',
}
export function Button({ variant = 'default', size = 'md', className = '', ...props }) {
  const sz = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-[13px]'
  return (
    <button
      className={`cursor-pointer rounded-lg border font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-50 ${sz} ${BTN[variant]} ${className}`}
      {...props}
    />
  )
}

// Segmented control (scenario presets, speed, tabs inside a card)
export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-black/10 bg-surface-2 p-0.5">
      {options.map(o => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold ${o.value === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Status chip: always icon + label + color, never color alone.
export function StatusChip({ color, icon, label, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-black/10 bg-surface px-2 py-0.5 text-xs font-semibold text-ink ${className}`}>
      <span className="grid size-4 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: color }} aria-hidden="true">
        {icon}
      </span>
      {label}
    </span>
  )
}

export const EVENT_STATUS = {
  upcoming: { color: 'var(--color-warning)', icon: '◷' },
  active: { color: 'var(--color-critical)', icon: '!' },
  expired: { color: 'var(--color-muted)', icon: '✓' },
}

export function Stat({ value, label, sub, tone }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5">
      <div className={`text-2xl font-bold leading-tight ${tone === 'good' ? 'text-good-text' : ''}`}>{value}</div>
      <div className="text-xs text-ink-2">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  )
}

export function SubHeading({ children, className = '' }) {
  return <div className={`mb-1.5 mt-3 text-xs font-bold uppercase tracking-wide text-ink-2 ${className}`}>{children}</div>
}

export function Slider({ label, value, min, max, step = 1, onChange, format = v => v, id }) {
  return (
    <label className="grid gap-1 text-xs text-ink-2" htmlFor={id}>
      <span className="flex justify-between">
        <span>{label}</span>
        <b className="tabular-nums text-ink">{format(value)}</b>
      </span>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="accent-accent" />
    </label>
  )
}
