import { CAUSES, HOTSPOTS, INCIDENT, MAP_LABELS, ROADS, ROUTE_ALT, ROUTE_ORIG, fmt, severity } from '../data'
import { tipHandlers, useTooltip } from './Tooltip'
import { Card, SevDot } from './ui'

export default function BottleneckMap({ selId, onSelect, tickets, incident }) {
  const tooltip = useTooltip()
  const maxDelay = HOTSPOTS[0].delay

  return (
    <Card title="Bottleneck X-ray" hint="Recurring chokepoints from probe speeds · schematic map, not to scale">
      <svg viewBox="0 0 620 440" role="img" aria-label="Schematic map of east Bengaluru with ranked hotspots" className="block h-auto w-full rounded-lg bg-land">
        <ellipse cx="360" cy="300" rx="40" ry="18" fill="var(--color-water)" transform="rotate(-12 360 300)" />
        <ellipse cx="240" cy="160" rx="14" ry="9" fill="var(--color-water)" />
        {ROADS.map((r, i) => (
          <path
            key={i}
            d={r.d}
            fill="none"
            stroke={r.major ? 'var(--color-road-major)' : 'var(--color-road)'}
            strokeWidth={r.major ? 6 : 3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {MAP_LABELS.map(([x, y, t]) => (
          <text key={t} x={x} y={y} fontSize="11" fill="var(--color-muted)" textAnchor="middle">{t}</text>
        ))}

        {incident > 0 && (
          <>
            <path
              d={ROUTE_ORIG}
              fill="none"
              stroke={incident === 2 ? 'var(--color-muted)' : 'var(--color-ink-2)'}
              strokeOpacity={incident === 2 ? 0.5 : 0.9}
              strokeWidth="3"
              strokeLinecap="round"
            />
            {incident === 2 && (
              <path d={ROUTE_ALT} fill="none" stroke="var(--color-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="route-anim" />
            )}
            <circle cx={INCIDENT.x} cy={INCIDENT.y} r="14" fill="var(--color-critical)" className="pulse-ring" />
            <g
              {...tipHandlers(tooltip, (
                <>
                  <b>Live incident</b><br />Waterlogging · ORR, Kadubeesanahalli<br />
                  <span className="text-ink-2">Speed 7 km/h vs 31 typical</span>
                </>
              ))}
            >
              <circle cx={INCIDENT.x} cy={INCIDENT.y} r="10" fill="var(--color-critical)" stroke="var(--color-surface)" strokeWidth="2" />
              <text x={INCIDENT.x} y={INCIDENT.y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">!</text>
            </g>
            <text x={INCIDENT.x + 16} y={INCIDENT.y + 4} fontSize="11" fontWeight="700" fill="var(--color-critical)">Waterlogging (live)</text>
          </>
        )}

        {HOTSPOTS.map((hs, i) => {
          const sev = severity(hs.delay)
          const r = 9 + 7 * Math.sqrt(hs.delay / maxDelay)
          const sel = hs.id === selId
          const main = CAUSES.find(c => c.key === hs.main).label
          return (
            <g
              key={hs.id}
              tabIndex={0}
              role="button"
              aria-label={`${i + 1}. ${hs.name}, ${sev.label}`}
              className="cursor-pointer outline-none"
              onClick={() => onSelect(hs.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(hs.id)
                }
              }}
              {...tipHandlers(tooltip, (
                <>
                  <b>{i + 1}. {hs.name}</b><br />
                  {fmt(hs.delay)} veh-hrs/day · {sev.label}<br />
                  <span className="text-ink-2">Main cause: {main}</span>
                </>
              ))}
            >
              {sel && <circle cx={hs.x} cy={hs.y} r={r + 5} fill="none" stroke="var(--color-ink)" strokeWidth="2" />}
              <circle cx={hs.x} cy={hs.y} r={r + 14} fill="transparent" />
              <circle cx={hs.x} cy={hs.y} r={r} fill={`var(--color-${sev.key})`} stroke="var(--color-surface)" strokeWidth="2" />
              <text
                x={hs.x}
                y={hs.y + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={sev.key === 'warning' ? '#0b0b0b' : '#fff'}
                className="pointer-events-none"
              >
                {i + 1}
              </text>
              {tickets[hs.id]?.status === 'fixed' && (
                <circle cx={hs.x + r * 0.75} cy={hs.y - r * 0.75} r="6" fill="var(--color-good)" stroke="var(--color-surface)" strokeWidth="1.5" />
              )}
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3.5">
        <SevDot sev={{ key: 'critical', label: 'Critical ≥ 3,000 veh-hrs/day' }} />
        <SevDot sev={{ key: 'serious', label: 'High 1,800–3,000' }} />
        <SevDot sev={{ key: 'warning', label: 'Moderate < 1,800' }} />
        <span className="inline-flex items-center gap-1 text-[11px] text-ink-2">
          <i className="inline-block size-2 rounded-full bg-good" />Fixed
        </span>
      </div>
    </Card>
  )
}
