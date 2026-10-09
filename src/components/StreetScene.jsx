// Placeholder for RealView 360° imagery: a top-down sketch of what Vision AI would tag on this stretch.
const W = 340
const H = 140
const LANE = 92 // y of the left (kerb-side) lane

const TAGS = {
  parked: 'Parked vehicles',
  bus: 'Bus stopping in lane',
  vendor: 'Carts in lane',
  pothole: 'Potholes',
  water: 'Standing water',
  merge: 'Lane drop: 3 → 2',
  signal: 'Signal',
  queue: 'Queue at stop line',
}

export default function StreetScene({ scene }) {
  const shapes = []
  let x = 30
  scene.forEach((item, i) => {
    const k = `${item}-${i}`
    if (item === 'parked') {
      shapes.push(
        <g key={k}>
          <rect x={x} y={LANE} width="26" height="14" rx="3" fill="var(--color-ink-2)" />
          <rect x={x + 30} y={LANE} width="26" height="14" rx="3" fill="var(--color-ink-2)" />
        </g>,
      )
      x += 70
    } else if (item === 'bus') {
      shapes.push(
        <g key={k}>
          <rect x={x} y={LANE - 2} width="58" height="18" rx="3" fill="var(--color-c-sig)" />
          <text x={x + 29} y={LANE + 11} fontSize="9" fontWeight="700" textAnchor="middle" fill="#fff">BUS</text>
        </g>,
      )
      x += 72
    } else if (item === 'vendor') {
      shapes.push(
        <g key={k}>
          <rect x={x} y={LANE} width="16" height="16" fill="var(--color-c-inc)" />
          <rect x={x + 20} y={LANE} width="16" height="16" fill="var(--color-c-inc)" />
        </g>,
      )
      x += 56
    } else if (item === 'pothole') {
      shapes.push(<ellipse key={k} cx={x + 12} cy={LANE + 6} rx="12" ry="6" fill="var(--color-ink)" opacity=".75" />)
      x += 50
    } else if (item === 'water') {
      shapes.push(<ellipse key={k} cx={x + 50} cy="70" rx="60" ry="26" fill="#2a78d6" opacity=".35" />)
      x += 110
    } else if (item === 'merge') {
      shapes.push(
        <g key={k}>
          <polygon points={`${x},${LANE - 6} ${x + 140},${LANE - 6} ${x + 140},${H - 22} ${x + 60},${H - 22}`} fill="var(--color-gridline)" />
          <line x1={x} y1={LANE - 6} x2={x + 140} y2={LANE - 6} stroke="var(--color-surface)" strokeWidth="2" />
        </g>,
      )
      x += 150
    } else if (item === 'signal') {
      const sx = W - 30
      shapes.push(
        <g key={k}>
          <line x1={sx} y1="22" x2={sx} y2={H - 22} stroke="var(--color-surface)" strokeWidth="3" />
          <rect x={sx + 8} y="4" width="10" height="24" rx="3" fill="var(--color-ink)" />
          <circle cx={sx + 13} cy="10" r="3" fill="#d03b3b" />
        </g>,
      )
    } else if (item === 'queue') {
      shapes.push(
        <g key={k}>
          {Array.from({ length: 6 }, (_, j) => (
            <rect key={j} x={W - 60 - j * 32} y={j % 2 ? 62 : 30} width="24" height="14" rx="3" fill="var(--color-ink-2)" />
          ))}
        </g>,
      )
    }
  })
  const tags = [...new Set(scene)].map(s => TAGS[s])

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Schematic street scene" className="block h-auto w-full rounded-lg bg-surface-2">
        <rect x="0" y="0" width={W} height="22" fill="var(--color-gridline)" />
        <rect x="0" y={H - 22} width={W} height="22" fill="var(--color-gridline)" />
        <rect x="0" y="22" width={W} height={H - 44} fill="var(--color-road-major)" />
        {[54, 86].map(y => (
          <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="var(--color-surface)" strokeWidth="2" strokeDasharray="14 10" />
        ))}
        {shapes}
      </svg>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {tags.map(t => (
          <span key={t} className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-ink-2">{t}</span>
        ))}
      </div>
      <div className="mt-1 text-[11px] text-muted">Placeholder for RealView 360° imagery; tags show what Vision AI would detect</div>
    </div>
  )
}
