import { DEMO_STEPS } from '../data'
import { Button, SimTag } from './ui'

export default function Header({ done, onReset }) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-4 border-b border-black/10 bg-surface px-4 py-2.5 sm:px-5">
      <div className="flex items-center gap-2.5">
        <div className="grid size-7 place-items-center rounded-lg bg-accent" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M1 12 L5 6 L8 9 L11 3 L15 8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1 className="text-[17px] font-bold tracking-tight">
            Mappls RoadPulse <span className="font-normal text-ink-2">· concept prototype</span>
          </h1>
          <div className="text-xs text-ink-2">Bengaluru · East zone · Diagnose → Fix → Measure</div>
        </div>
        <SimTag>⚠ Simulated data</SimTag>
      </div>

      <nav aria-label="Demo progress" className="ml-auto hidden flex-wrap gap-1.5 md:flex">
        {DEMO_STEPS.map((s, i) => (
          <span
            key={s}
            className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${done.has(i + 1) ? 'border-good text-good-text' : 'border-black/10 text-muted'}`}
          >
            {done.has(i + 1) && <b>✓ </b>}
            {s}
          </span>
        ))}
      </nav>

      <Button onClick={onReset} title="Reset demo">↺ Reset</Button>
    </header>
  )
}
