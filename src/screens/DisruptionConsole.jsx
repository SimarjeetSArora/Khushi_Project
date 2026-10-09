import { Suspense, lazy, useState } from 'react'
import LineChart from '../components/LineChart'
import { hasWebGL } from '../components/three/webgl'
import { Button, Card, EVENT_STATUS, Segmented, SimTag, Slider, StatusChip, SubHeading } from '../components/ui'
import { BEST_SPLIT, FAST_BAND, SPLITS, divertedTrip, forecastSeries, options, residentDelay } from '../engine/closure'
import { EVENTS, clockLabel } from '../engine/events'
import { useDemo } from '../engine/store'

const DiversionMap3D = lazy(() => import('../components/three/DiversionMap3D'))

const pct = s => `${Math.round(s * 100)}%`

export function EventPicker({ compact = false }) {
  const { eventId, dispatch } = useDemo()
  return (
    <div className="flex flex-wrap gap-2">
      {Object.values(EVENTS).map(ev => (
        <Button key={ev.id} size={compact ? 'sm' : 'md'} variant={eventId === ev.id ? 'primary' : 'default'} onClick={() => dispatch({ type: 'load', id: ev.id })}>
          Load: {ev.kind === 'Planned' ? 'Kolkata Puja notice (planned)' : 'Missing Link landslide (unplanned)'}
        </Button>
      ))}
    </div>
  )
}

function EventCard({ ev, status, clock }) {
  const st = EVENT_STATUS[status.key]
  const rows = [
    ['Source', ev.source],
    ['Road closed', ev.closed],
    ['Alternative corridor', ev.corridor],
    ['Bypass', ev.bypass],
    ['Starts', `${clockLabel(ev.startsIn)}${ev.kind === 'Planned' ? ` (${ev.startsIn}-min early warning)` : ''}`],
    ['Expected end', clockLabel(ev.startsIn + ev.duration)],
    ['Confidence', ev.confidence],
  ]
  return (
    <Card title="Event card" right={<StatusChip color={st.color} icon={st.icon} label={status.label} />}>
      <div className="mt-1 text-[17px] font-bold">{ev.name}</div>
      <div className="mb-2 text-xs text-ink-2">
        {ev.kind} · {ev.city} ·{' '}
        {status.key === 'upcoming' ? `starts in ${-status.t} min` : status.key === 'active' ? `active for ${status.t} min` : 'ended'} · now {clockLabel(clock)}
      </div>
      <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-2">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 rounded-md bg-sim-bg px-2 py-1 text-[11px] font-semibold text-sim-ink">
        Based on real event ({ev.basedOn}); FlowGuard was not used. Volumes and times are assumed.
      </p>
    </Card>
  )
}

function SchematicMap({ ev, split, statusKey }) {
  const [view, setView] = useState(() => (hasWebGL() ? '3d' : '2d'))
  const wc = 3 + 9 * split
  const wb = 3 + 9 * (1 - split)
  const jx = [250, 360, 470]
  return (
    <Card
      title="Schematic map"
      hint="Not to scale · route width and traffic show the share of diverted vehicles"
      right={<Segmented label="Map view" value={view} onChange={setView} options={[{ value: '3d', label: '3D' }, { value: '2d', label: '2D' }]} />}
    >
      {view === '3d' ? (
        <Suspense fallback={<div className="grid h-[320px] place-items-center rounded-lg bg-land text-xs text-muted">Loading 3D map…</div>}>
          <DiversionMap3D ev={ev} split={split} statusKey={statusKey} />
        </Suspense>
      ) : (
      <svg viewBox="0 0 720 260" className="block h-auto w-full rounded-lg bg-land" role="img" aria-label="Schematic map of the closure and diversion routes">
        {/* closed road */}
        <path d="M 80 130 C 250 120 470 120 640 130" fill="none" stroke="var(--color-critical)" strokeWidth="8" strokeDasharray="14 8" opacity=".85" />
        {[300, 360, 420].map(x => (
          <text key={x} x={x} y="129" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--color-critical)">✕</text>
        ))}
        <text x="360" y="110" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-critical)">CLOSED · {ev.closed}</text>
        {/* corridor */}
        <path d="M 80 130 C 150 200 200 205 250 205 L 470 205 C 520 205 570 200 640 130" fill="none" stroke="var(--color-accent)" strokeWidth={wc} strokeLinecap="round" />
        <text x="360" y="240" textAnchor="middle" fontSize="12" fill="var(--color-ink)">{ev.corridor} · {pct(split)}</text>
        {jx.map((x, i) => (
          <g key={x}>
            <circle cx={x} cy="205" r="11" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="2" />
            <text x={x} y="209" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-ink)">{i + 1}</text>
            <text x={x} y="186" textAnchor="middle" fontSize="10" fill="var(--color-ink-2)">{ev.junctions[i]}</text>
          </g>
        ))}
        {/* bypass */}
        <path d="M 80 130 C 140 40 260 30 360 30 C 460 30 580 40 640 130" fill="none" stroke="var(--color-c-geo)" strokeWidth={wb} strokeLinecap="round" strokeDasharray="10 6" />
        <text x="360" y="22" textAnchor="middle" fontSize="12" fill="var(--color-ink)">{ev.bypass} · {pct(1 - split)}</text>
        {/* ends */}
        {[[80, 'From'], [640, 'To']].map(([x, l]) => (
          <g key={l}>
            <circle cx={x} cy="130" r="7" fill="var(--color-ink)" />
            <text x={x} y="155" textAnchor="middle" fontSize="11" fill="var(--color-ink-2)">{l}</text>
          </g>
        ))}
      </svg>
      )}
    </Card>
  )
}

export default function DisruptionConsole() {
  const { ev, status, clock, split, approved, log, playing, dispatch } = useDemo()

  if (!ev) {
    return (
      <Card title="Disruption Command Console" hint="A closure has been verified. Where will its traffic go, what are the options, and what will each cost?">
        <p className="mb-3 text-[13px]">Load a scripted event to start. Every other dashboard reacts to it.</p>
        <EventPicker />
      </Card>
    )
  }

  const series = forecastSeries(ev, split)
  const nowT = Math.max(-15, Math.min(150, status.t))
  const delayNow = residentDelay(split)
  const opts = options(split)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <EventPicker compact />
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => dispatch({ type: 'play', playing: !playing })}>{playing ? '❚❚ Pause clock' : '▶ Run clock'}</Button>
          <Button size="sm" onClick={() => dispatch({ type: 'tick', minutes: 10 })} disabled={!playing}>+10 min</Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-4">
          <EventCard ev={ev} status={status} clock={clock} />

          <Card title="Options" hint="FlowGuard forecasts the cost; the authority decides">
            <div className="grid gap-2">
              {opts.map(o => {
                const isApproved = approved?.id === o.id
                return (
                  <div key={o.id} className={`rounded-lg border p-3 ${isApproved ? 'border-good' : 'border-black/10'}`}>
                    <div className="text-[13px] font-semibold">{o.title}</div>
                    <div className="mb-2 text-xs text-ink-2">{o.detail}</div>
                    <div className="mb-2 flex gap-4 text-xs">
                      <span>Residents' delay <b className="tabular-nums">{Math.round(o.delay)} s/veh</b></span>
                      <span>Diverted trip <b className="tabular-nums">{o.trip.toFixed(1)} min</b></span>
                    </div>
                    {isApproved ? (
                      <StatusChip color="var(--color-good)" icon="✓" label={`Approved at ${clockLabel(approved.at)}`} />
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="good" onClick={() => dispatch({ type: 'decide', option: o, approve: true })}>Approve</Button>
                        <Button size="sm" onClick={() => dispatch({ type: 'decide', option: o, approve: false })}>Reject</Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          <Card title="Decision log" right={null}>
            <ol className="grid gap-1.5">
              {[...log].reverse().map((l, i) => (
                <li key={log.length - i} className="grid grid-cols-[44px_1fr] gap-2 text-xs">
                  <span className="font-semibold tabular-nums text-muted">{l.time}</span>
                  <span className={l.tone === 'good' ? 'text-good-text' : l.tone === 'warn' ? 'font-semibold text-critical' : 'text-ink'}>{l.text}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <SchematicMap ev={ev} split={split} statusKey={status.key} />

          <Card title="Inflow forecast" hint={`Extra vehicles per 5 minutes arriving on ${ev.corridor} at a ${pct(split)} split`}>
            <LineChart
              ariaLabel="Forecast of extra vehicles per 5 minutes"
              series={[{ key: 'v', label: 'Extra vehicles / 5 min', color: 'var(--color-accent)', points: series.map(p => ({ x: p.t, y: p.v })), area: true }]}
              xDomain={[-15, 150]}
              yMax={(ev.divertedVph / 12) * 1.02}
              xTicks={[-15, 0, 30, 60, 90, 120, 150].map(v => ({ v, label: clockLabel(ev.startsIn + v) }))}
              xFormat={v => `${clockLabel(ev.startsIn + v)} (${v >= 0 ? 'T+' : 'T'}${v} min)`}
              valueFormat={v => `${Math.round(v)} veh`}
              yFormat={v => Math.round(v)}
              markers={[{ x: nowT, label: 'now' }]}
              height={190}
            />
          </Card>

          <Card title="Diversion trade-off" hint="Share of diverted traffic sent via the corridor · two measures, two charts, one split">
            <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Slider id="split" label="Share via corridor" value={Math.round(split * 100)} min={0} max={100} onChange={v => dispatch({ type: 'split', split: v / 100 })} format={v => `${v}%`} />
              <div className="text-[13px]">
                Residents' delay <b>{Math.round(delayNow)} s/veh</b>{' '}
                <span className="text-ink-2">({(delayNow / 18).toFixed(1)}× normal)</span> · diverted trip <b>{divertedTrip(split).toFixed(1)} min</b>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="min-w-0">
                <SubHeading className="mt-0">Corridor residents' delay (s per vehicle)</SubHeading>
                <LineChart
                  ariaLabel="Residents' delay by split"
                  series={[{ key: 'd', label: "Residents' delay", color: 'var(--color-c-sig)', points: SPLITS.filter((_, i) => i % 5 === 0).map(s => ({ x: s, y: residentDelay(s) })) }]}
                  xDomain={[0, 1]}
                  xTicks={[0, 0.25, 0.5, 0.75, 1].map(v => ({ v, label: pct(v) }))}
                  xFormat={v => `${pct(v)} via corridor`}
                  valueFormat={v => `${Math.round(v)} s/veh`}
                  dot={{ x: split, y: delayNow, color: 'var(--color-c-sig)' }}
                  height={170}
                />
              </div>
              <div className="min-w-0">
                <SubHeading className="mt-0">Diverted drivers' average trip (min)</SubHeading>
                <LineChart
                  ariaLabel="Diverted trip time by split"
                  series={[{ key: 't', label: 'Diverted trip', color: 'var(--color-accent)', points: SPLITS.filter((_, i) => i % 5 === 0).map(s => ({ x: s, y: divertedTrip(s) })) }]}
                  xDomain={[0, 1]}
                  yMax={30}
                  xTicks={[0, 0.25, 0.5, 0.75, 1].map(v => ({ v, label: pct(v) }))}
                  xFormat={v => `${pct(v)} via corridor`}
                  valueFormat={v => `${v.toFixed(1)} min`}
                  bands={[{ x0: FAST_BAND[0], x1: FAST_BAND[1], label: 'fastest' }]}
                  dot={{ x: split, y: divertedTrip(split), color: 'var(--color-accent)' }}
                  height={170}
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              <SimTag className="mr-1" /> Curves are assumed, not fitted to data. Fastest average diverted trip at {pct(BEST_SPLIT)}.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
