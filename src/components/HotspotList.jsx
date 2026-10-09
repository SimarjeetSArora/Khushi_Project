import { HOTSPOTS, fmt, severity } from '../data'
import { Card, SevDot } from './ui'

export default function HotspotList({ selId, onSelect }) {
  const max = HOTSPOTS[0].delay
  return (
    <Card title="Worst hotspots" hint="Ranked by daily delay (vehicle-hours lost)">
      <div className="grid gap-0.5">
        {HOTSPOTS.map((hs, i) => {
          const sel = hs.id === selId
          const sev = severity(hs.delay)
          return (
            <button
              key={hs.id}
              onClick={() => onSelect(hs.id)}
              className={`grid w-full cursor-pointer grid-cols-[22px_1fr] gap-2 rounded-lg border p-2 text-left hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent ${sel ? 'border-accent bg-surface-2' : 'border-transparent'}`}
            >
              <span className="font-bold tabular-nums text-ink-2">{i + 1}</span>
              <span>
                <span className="block text-[13px] font-semibold">{hs.name}</span>
                <span className="mt-0.5 flex justify-between text-xs text-ink-2">
                  <span>{fmt(hs.delay)} veh-hrs/day</span>
                  <SevDot sev={sev} />
                </span>
                <span
                  className="mt-1.5 block h-1.5 rounded-r"
                  style={{ width: `${((hs.delay / max) * 100).toFixed(1)}%`, background: `var(--color-${sev.key})` }}
                />
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
