import { useState } from 'react'
import { tipHandlers, useTooltip } from '../components/Tooltip'
import { Card, SimTag, StatusChip } from '../components/ui'
import { CALENDAR, ORDERS, RISK, assess, fmtClock } from '../engine/fleet'
import { useDemo } from '../engine/store'
import { EventPicker } from './DisruptionConsole'

function RouteComparison({ order, a }) {
  const tooltip = useTooltip()
  const end = order.win[1]
  const vals = a.routes.map(r => r.eta).filter(v => v !== null)
  const max = Math.max(end, ...vals) + 15
  const min = -5
  // Bars use 80% of the track so the ETA text after each bar always fits.
  const X = v => ((v - min) / (max - min)) * 80
  return (
    <Card title={`Route comparison · ${order.id}`} hint={`${order.from} → ${order.to} · ${order.vehicle} · window ${fmtClock(order.win[0])}–${fmtClock(end)}`}>
      <div className="relative grid gap-2.5">
        <div className="pointer-events-none absolute inset-y-0 border-l-2 border-dashed border-ink" style={{ left: `calc(130px + (100% - 130px) * ${X(end) / 100})` }} />
        {a.routes.map(r => {
          const risk = r.eta === null ? null : RISK[(end - r.eta >= 15 ? 'ok' : end - r.eta >= 0 ? 'risk' : 'miss')]
          return (
            <div key={r.id} className="grid grid-cols-[122px_1fr] items-center gap-2">
              <span className="text-xs text-ink-2">{r.label}</span>
              {r.eta === null ? (
                <span className="rounded bg-[repeating-linear-gradient(45deg,var(--color-gridline)_0_6px,transparent_6px_12px)] px-2 py-1 text-xs font-semibold text-critical">{r.note}</span>
              ) : (
                <div className="flex items-center gap-2" {...tipHandlers(tooltip, <><b>{r.label}</b><br />ETA {fmtClock(r.eta)} · {risk.label}</>)}>
                  <div className="h-4 rounded-r" style={{ width: `${X(r.eta)}%`, background: r.id === a.current?.id ? 'var(--color-accent)' : 'var(--color-axis)' }} />
                  <span className="whitespace-nowrap text-xs tabular-nums">{fmtClock(r.eta)}{r.note ? ` · ${r.note}` : ''}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted">Dashed line = window ends {fmtClock(end)}. Blue = route navigation gives now. Bypass and approach times are assumed values in the engine.</p>
    </Card>
  )
}

export default function FleetBoard() {
  const { ev, live, split, status } = useDemo()
  const [sel, setSel] = useState('PN-2101')
  const rows = ORDERS.map(o => ({ o, a: assess(o, ev, split, live) }))
  const counts = Object.fromEntries(Object.keys(RISK).map(k => [k, rows.filter(r => r.a.risk.key === k).length]))
  const selected = rows.find(r => r.o.id === sel) ?? rows[0]

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {Object.values(RISK).map(r => (
          <StatusChip key={r.key} color={r.color} icon={r.icon} label={`${r.label}: ${counts[r.key]}`} className="px-3 py-1 text-[13px]" />
        ))}
        <span className="text-[13px] text-ink-2">
          {ev
            ? <>Forecast from the Disruption Console: <b className="text-ink">{ev.name}</b> ({status.label.toLowerCase()}, {Math.round(split * 100)}% via corridor)</>
            : 'No event loaded: all orders on their usual routes.'}
        </span>
        {!ev && <div className="ml-auto"><EventPicker compact /></div>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card title="Deliveries" right={<SimTag>Sample data</SimTag>} hint="Now 10:00 · click an order to compare routes">
          {/* Phones: one card per order */}
          <ul className="grid gap-2 md:hidden">
            {rows.map(({ o, a }) => (
              <li key={o.id}>
                <button
                  onClick={() => setSel(o.id)}
                  aria-pressed={o.id === sel}
                  className={`grid w-full cursor-pointer gap-1.5 rounded-lg border p-3 text-left text-[13px] ${o.id === sel ? 'border-accent bg-accent/5' : 'border-black/10'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <b className="tabular-nums">{o.id} · {o.vehicle}</b>
                    <StatusChip color={a.risk.color} icon={a.risk.icon} label={a.risk.label} />
                  </span>
                  <span>{o.to} <span className="text-xs text-muted">from {o.from}</span></span>
                  <span className="text-xs text-ink-2 tabular-nums">Window {fmtClock(o.win[0])}–{fmtClock(o.win[1])} · ETA {a.eta === null ? '—' : fmtClock(a.eta)}</span>
                  {a.action && (
                    <span className="text-xs">
                      <b>{a.action.label}</b>
                      {a.action.saved ? <span className="text-good-text"> · saves {Math.round(a.action.saved)} min</span> : null}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-xs text-ink-2">
                  {['Order', 'Destination', 'Vehicle', 'Window', 'Current ETA', 'Risk', 'Recommended action'].map(h => (
                    <th key={h} className="border-b border-gridline px-2 py-1.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ o, a }) => (
                  <tr
                    key={o.id}
                    onClick={() => setSel(o.id)}
                    className={`cursor-pointer hover:bg-surface-2 ${o.id === sel ? 'bg-accent/8' : ''}`}
                  >
                    <td className="border-b border-gridline px-2 py-2 font-semibold tabular-nums">
                      <button className="cursor-pointer text-left" onClick={() => setSel(o.id)} aria-pressed={o.id === sel}>{o.id}</button>
                    </td>
                    <td className="border-b border-gridline px-2 py-2">{o.to}<div className="text-[11px] text-muted">from {o.from}</div></td>
                    <td className="border-b border-gridline px-2 py-2">{o.vehicle}</td>
                    <td className="border-b border-gridline px-2 py-2 tabular-nums">{fmtClock(o.win[0])}–{fmtClock(o.win[1])}</td>
                    <td className="border-b border-gridline px-2 py-2 tabular-nums">{a.eta === null ? '—' : fmtClock(a.eta)}</td>
                    <td className="border-b border-gridline px-2 py-2"><StatusChip color={a.risk.color} icon={a.risk.icon} label={a.risk.label} /></td>
                    <td className="border-b border-gridline px-2 py-2">
                      {a.action ? (
                        <>
                          <b>{a.action.label}</b>
                          {a.action.saved ? <span className="text-good-text"> · saves {Math.round(a.action.saved)} min</span> : null}
                          {a.action.eta !== null && a.action.eta !== undefined && <div className="text-[11px] text-muted">new ETA {fmtClock(a.action.eta)}</div>}
                        </>
                      ) : <span className="text-muted">No action</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted">On time: ≥ 15 min to spare · At risk: 0–15 min · Will miss: after the window or route banned. Add-on to Mappls route optimisation, not a new router.</p>
        </Card>

        <div className="grid content-start gap-4">
          <RouteComparison order={selected.o} a={selected.a} />

          <Card title="Restriction calendar" right={<SimTag>Sample data</SimTag>} hint="Goods-vehicle bans and closures, next 7 days">
            <ol className="grid gap-1.5">
              {CALENDAR.map(d => (
                <li key={d.day} className="grid grid-cols-[78px_1fr] gap-2 border-b border-gridline pb-1.5 text-xs last:border-0">
                  <span className="font-semibold text-ink-2">{d.day}</span>
                  <span className="grid gap-1">
                    {d.items.length === 0 && <span className="text-muted">No restrictions</span>}
                    {d.items.map(it => (
                      <span key={it.text} className={it.when && ev?.id !== it.when ? 'text-muted' : ''}>
                        <span className="mr-1.5 rounded border border-black/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-ink-2">{it.tag}</span>
                        {it.city}: {it.text}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  )
}
