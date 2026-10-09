import { useEffect, useRef, useState } from 'react'
import { HOTSPOTS, HOURS, after, before, hourLabel, peakHour } from '../data'
import { useTooltip } from './Tooltip'
import { Button, Card, Pill, SimTag, SubHeading } from './ui'

const H = 230
const M = { l: 36, r: 12, t: 10, b: 26 }

function useWidth() {
  const ref = useRef(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

function Chart({ hs, fixed }) {
  const [wrapRef, W] = useWidth()
  const [hover, setHover] = useState(null)
  const tooltip = useTooltip()

  const maxY = Math.ceil((Math.max(hs.am, hs.pm) + 2) / 5) * 5
  const X = h => M.l + ((h - 6) / 16) * (W - M.l - M.r)
  const Y = v => H - M.b - (v / maxY) * (H - M.t - M.b)
  const line = fn => HOURS.map((h, i) => `${i ? 'L' : 'M'} ${X(h).toFixed(1)} ${Y(fn(hs, h)).toFixed(1)}`).join(' ')
  const gap = line(after) + ' ' + [...HOURS].reverse().map(h => `L ${X(h).toFixed(1)} ${Y(before(hs, h)).toFixed(1)}`).join(' ') + ' Z'
  const ph = peakHour(hs)
  const ticks = []
  for (let v = 0; v <= maxY; v += 5) ticks.push(v)

  const onMove = e => {
    const r = e.currentTarget.ownerSVGElement.getBoundingClientRect()
    const px = (e.clientX - r.left) * (W / r.width)
    const h = Math.max(6, Math.min(22, Math.round(6 + ((px - M.l) / (W - M.l - M.r)) * 16)))
    const b = before(hs, h)
    const a = after(hs, h)
    setHover(h)
    tooltip.show(
      <>
        <b>{hourLabel(h)}</b><br />
        <span className="text-ink-2">Before:</span> {b.toFixed(1)} min
        {fixed && <><br /><span className="text-ink-2">After:</span> {a.toFixed(1)} min (−{(b - a).toFixed(1)})</>}
      </>,
      e,
    )
  }

  return (
    <div ref={wrapRef}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
        {ticks.map(v => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? 'var(--color-axis)' : 'var(--color-gridline)'} />
            <text x={M.l - 6} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)" className="tabular-nums">{v}</text>
          </g>
        ))}
        {[6, 9, 12, 15, 18, 21].map(h => (
          <text key={h} x={X(h)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-muted)">{hourLabel(h)}</text>
        ))}
        <path d={line(before)} fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
        {fixed && (
          <>
            <path d={gap} fill="var(--color-accent)" opacity=".12" />
            <path d={line(after)} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" />
            <text x={X(ph) + 8} y={Y(after(hs, ph)) + 16} fontSize="11" fontWeight="600" fill="var(--color-ink-2)">After</text>
          </>
        )}
        <text x={X(ph) + 8} y={Y(before(hs, ph)) - 4} fontSize="11" fontWeight="600" fill="var(--color-ink-2)">Before</text>

        {hover !== null && (
          <g>
            <line x1={X(hover)} x2={X(hover)} y1={M.t} y2={H - M.b} stroke="var(--color-axis)" />
            <circle cx={X(hover)} cy={Y(before(hs, hover))} r="4" fill="var(--color-muted)" stroke="var(--color-surface)" strokeWidth="2" />
            {fixed && <circle cx={X(hover)} cy={Y(after(hs, hover))} r="4" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="2" />}
          </g>
        )}
        <rect
          x={M.l}
          y={M.t}
          width={W - M.l - M.r}
          height={H - M.t - M.b}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={() => { setHover(null); tooltip.hide() }}
        />
      </svg>
    </div>
  )
}

function DataTable({ hs, fixed }) {
  const cell = 'border-b border-gridline px-2 py-1 text-right'
  return (
    <table className="w-full border-collapse text-xs tabular-nums">
      <thead>
        <tr>
          <th className={`${cell} text-left`}>Hour</th>
          <th className={cell}>Before (min)</th>
          {fixed && <th className={cell}>After (min)</th>}
        </tr>
      </thead>
      <tbody>
        {HOURS.map(h => (
          <tr key={h}>
            <td className={`${cell} text-left`}>{hourLabel(h)}</td>
            <td className={cell}>{before(hs, h).toFixed(1)}</td>
            {fixed && <td className={cell}>{after(hs, h).toFixed(1)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function BeforeAfter({ hs, tickets, onMarkFixed }) {
  const [showTable, setShowTable] = useState(false)
  const fixed = tickets[hs.id]?.status === 'fixed'
  const ph = peakHour(hs)
  const b = before(hs, ph)
  const a = after(hs, ph)

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-ink-2">
            Before / after: <span className="normal-case tracking-normal text-ink">{hs.name}</span> <SimTag />
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Travel time on this {hs.len} km stretch by hour, weekday average
            {fixed ? ', 4 weeks before vs after the fix' : '. The after-fix line appears once a ticket is marked fixed.'}
          </p>
        </div>
        <div className="text-right">
          {fixed ? (
            <>
              <b className="block text-[28px] leading-tight text-good-text">−{(b - a).toFixed(1)} min</b>
              <span className="text-xs text-ink-2">at {hourLabel(ph)} peak ({b.toFixed(0)} → {a.toFixed(0)} min) · simulated</span>
            </>
          ) : (
            <>
              <b className="block text-[28px] leading-tight">{b.toFixed(0)} min</b>
              <span className="text-xs text-ink-2">at {hourLabel(ph)} peak vs {hs.ff} min free-flow</span>
            </>
          )}
        </div>
      </div>

      <div className="my-1.5 flex items-center gap-4 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block w-4 border-t-2 border-dashed border-muted" />Before fix</span>
        {fixed && <span className="inline-flex items-center gap-1.5"><i className="inline-block w-4 border-t-2 border-accent" />After fix (4 weeks)</span>}
        <button className="ml-auto cursor-pointer text-xs text-accent underline" onClick={() => setShowTable(s => !s)}>
          {showTable ? 'View as chart' : 'View as table'}
        </button>
      </div>
      {showTable ? <DataTable hs={hs} fixed={fixed} /> : <Chart hs={hs} fixed={fixed} />}

      <SubHeading className="mt-4">Fix tickets</SubHeading>
      <div className="grid gap-2">
        {Object.keys(tickets).length === 0 && <p className="text-xs text-muted">No tickets yet. Open a hotspot and raise one.</p>}
        {Object.entries(tickets).map(([id, t]) => {
          const h = HOTSPOTS.find(x => x.id === id)
          return (
            <div key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 px-3 py-2">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold">#{t.no} · {t.dept}: {t.action}</div>
                <div className="text-xs text-ink-2">{h.name} · {t.window}</div>
              </div>
              <div className="flex items-center gap-2">
                {t.status === 'open' ? (
                  <>
                    <Pill tone="open">Open</Pill>
                    <Button onClick={() => onMarkFixed(id)}>Mark fixed &amp; measure</Button>
                  </>
                ) : (
                  <Pill tone="fixed">Fixed ✓</Pill>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
