import { useEffect, useRef, useState } from 'react'
import { useTooltip } from './Tooltip'

/* eslint-disable react-refresh/only-export-components */
export function useWidth(initial = 600) {
  const ref = useRef(null)
  const [w, setW] = useState(initial)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

// Round tick step (1, 2, 2.5 or 5 × 10^k) giving about four intervals.
const niceStep = v => {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

/**
 * Single-axis SVG line chart with a crosshair tooltip.
 * series: [{ key, label, color, points: [{x, y}], dashed?, area? }]
 * markers: [{ x, label }] vertical reference lines; bands: [{ x0, x1, label }]
 */
export default function LineChart({
  series, xDomain, yMax, height = 200, xTicks = [], yFormat = v => v, xFormat = v => v,
  markers = [], bands = [], dot, ariaLabel, valueFormat = v => v,
}) {
  const [ref, W] = useWidth()
  const [hover, setHover] = useState(null)
  const tooltip = useTooltip()
  const M = { l: 40, r: 14, t: 12, b: 24 }
  const [x0, x1] = xDomain
  const raw = yMax ?? Math.max(...series.flatMap(s => s.points.map(p => p.y))) * 1.1
  const stepY = niceStep(raw / 4)
  const top = Math.ceil(raw / stepY) * stepY
  const X = x => M.l + ((x - x0) / (x1 - x0)) * (W - M.l - M.r)
  const Y = y => height - M.b - (y / top) * (height - M.t - M.b)
  const yTicks = Array.from({ length: Math.round(top / stepY) + 1 }, (_, i) => i * stepY)
  const path = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ')
  const xs = series[0]?.points.map(p => p.x) ?? []

  const onMove = e => {
    const r = e.currentTarget.ownerSVGElement.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const xv = x0 + ((px - M.l) / (W - M.l - M.r)) * (x1 - x0)
    const nearest = xs.reduce((a, x) => (Math.abs(x - xv) < Math.abs(a - xv) ? x : a), xs[0])
    setHover(nearest)
    tooltip.show(
      <>
        <b>{xFormat(nearest)}</b>
        {series.map(s => {
          const p = s.points.find(q => q.x === nearest)
          return p ? <div key={s.key}><span className="text-ink-2">{s.label}:</span> {valueFormat(p.y)}</div> : null
        })}
      </>,
      e,
    )
  }

  return (
    <div ref={ref}>
      <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={ariaLabel} className="block">
        {bands.map(b => (
          <g key={b.label}>
            <rect x={X(b.x0)} y={M.t} width={X(b.x1) - X(b.x0)} height={height - M.t - M.b} fill="var(--color-good)" opacity=".08" />
            <text x={(X(b.x0) + X(b.x1)) / 2} y={M.t + 11} textAnchor="middle" fontSize="10" fill="var(--color-good-text)">{b.label}</text>
          </g>
        ))}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? 'var(--color-axis)' : 'var(--color-gridline)'} />
            <text x={M.l - 6} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)" className="tabular-nums">{yFormat(v)}</text>
          </g>
        ))}
        {xTicks.map(t => (
          <text key={t.v} x={X(t.v)} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--color-muted)">{t.label}</text>
        ))}
        {series.map(s => (
          <g key={s.key}>
            {s.area && <path d={`${path(s.points)} L${X(s.points.at(-1).x)} ${Y(0)} L${X(s.points[0].x)} ${Y(0)} Z`} fill={s.color} opacity=".1" />}
            <path d={path(s.points)} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" />
          </g>
        ))}
        {markers.map(m => (
          <g key={m.label}>
            <line x1={X(m.x)} x2={X(m.x)} y1={M.t} y2={height - M.b} stroke="var(--color-ink)" strokeWidth="1.5" />
            <text x={X(m.x) + 4} y={M.t + 10} fontSize="11" fontWeight="700" fill="var(--color-ink)">{m.label}</text>
          </g>
        ))}
        {dot && (
          <circle cx={X(dot.x)} cy={Y(dot.y)} r="5" fill={dot.color} stroke="var(--color-surface)" strokeWidth="2" />
        )}
        {hover !== null && (
          <g>
            <line x1={X(hover)} x2={X(hover)} y1={M.t} y2={height - M.b} stroke="var(--color-axis)" />
            {series.map(s => {
              const p = s.points.find(q => q.x === hover)
              return p ? <circle key={s.key} cx={X(p.x)} cy={Y(p.y)} r="4" fill={s.color} stroke="var(--color-surface)" strokeWidth="2" /> : null
            })}
          </g>
        )}
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={height - M.t - M.b} fill="transparent"
          onMouseMove={onMove} onMouseLeave={() => { setHover(null); tooltip.hide() }} />
      </svg>
    </div>
  )
}
