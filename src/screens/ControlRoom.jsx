import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { hasWebGL } from '../components/three/webgl'
import { inflowProfile } from '../engine/closure'
import { CONTROLLERS, JUNCTIONS, P, SCENARIOS, SEED, createArrivalStream, createSim, occupancy, step, summarize } from '../engine/corridor'
import { DEFAULT_CORRIDOR } from '../engine/events'
import { useDemo } from '../engine/store'
import { Button, Card, Segmented, SimTag, Slider } from '../components/ui'
import { CTRL_COLOR, CTRL_SHORT } from '../theme'


const JX = [230, 530, 830] // junction x positions in the lane drawing
const ENTRY_X = 20
const EXIT_X = 985
const ROAD_Y = 58

function Lane({ sim, names, highlight }) {
  const cars = []
  const prevX = j => (j === 0 ? ENTRY_X : JX[j - 1] + 16)
  // main queues
  JX.forEach((x, j) => {
    const q = sim.mainQ[j].length
    const room = Math.floor((x - 16 - prevX(j)) / 12)
    for (let i = 0; i < Math.min(q, room); i++) cars.push(<rect key={`q${j}-${i}`} x={x - 16 - (i + 1) * 12} y={ROAD_Y - 4} width="9" height="8" rx="2" fill="var(--color-ink-2)" />)
    if (q > room) cars.push(<text key={`qo${j}`} x={prevX(j) + 2} y={ROAD_Y - 9} fontSize="10" fontWeight="700" fill="var(--color-critical)">+{q - room}</text>)
  })
  // exit queue at D
  sim.exitQ.slice(0, 12).forEach((_, i) => cars.push(<rect key={`e${i}`} x={EXIT_X - 8 - (i + 1) * 12} y={ROAD_Y - 4} width="9" height="8" rx="2" fill="var(--color-ink-2)" />))
  // vehicles moving on links
  sim.link.forEach((l, j) => {
    const start = JX[j] + 16
    const tailQ = j < 2 ? sim.mainQ[j + 1].length : sim.exitQ.length
    const end = (j < 2 ? JX[j + 1] - 16 : EXIT_X - 8) - tailQ * 12 - 10
    l.forEach((c, i) => {
      const prog = Math.min(1, Math.max(0, 1 - (c.at - sim.t) / P.freeFlow[j]))
      cars.push(<rect key={`l${j}-${i}`} x={start + prog * Math.max(0, end - start)} y={ROAD_Y - 4} width="9" height="8" rx="2" fill="var(--color-accent)" opacity=".75" />)
    })
  })

  return (
    <svg viewBox="0 0 1000 128" className="block h-auto w-full" role="img" aria-label="Corridor lane">
      <line x1={ENTRY_X} x2={EXIT_X} y1={ROAD_Y} y2={ROAD_Y} stroke="var(--color-road)" strokeWidth="16" strokeLinecap="round" />
      {JX.map((x, j) => (
        <g key={x}>
          <line x1={x} x2={x} y1={ROAD_Y - 24} y2={ROAD_Y + 50} stroke="var(--color-road)" strokeWidth="12" />
          <text x={x} y="14" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-ink)">{JUNCTIONS[j]} · {names[j]}</text>
        </g>
      ))}
      <text x={EXIT_X} y="14" textAnchor="end" fontSize="11" fill="var(--color-muted)">Downstream signal D</text>
      <circle cx={EXIT_X - 4} cy={ROAD_Y - 18} r="4" fill={sim.t % P.exitCycle < sim.exitGreen ? 'var(--color-good)' : 'var(--color-critical)'} />
      {cars}
      {/* side-street queues (cross the corridor) */}
      {JX.map((x, j) => {
        const q = sim.sideQ[j].length
        return (
          <g key={`s${x}`}>
            {Array.from({ length: Math.min(q, 4) }, (_, i) => (
              <rect key={i} x={x - 4} y={ROAD_Y + 14 + i * 10} width="8" height="7" rx="2" fill="var(--color-c-geo)" />
            ))}
            {q > 4 && <text x={x + 9} y={ROAD_Y + 50} fontSize="10" fill="var(--color-ink-2)">+{q - 4}</text>}
          </g>
        )
      })}
      {/* signals */}
      {JX.map((x, j) => {
        const ph = sim.sig[j].phase
        const c = ph === 'main' ? 'var(--color-good)' : ph === 'side' ? 'var(--color-critical)' : 'var(--color-warning)'
        return (
          <g key={`g${x}`}>
            <rect x={x - 26} y={ROAD_Y - 28} width="12" height="12" rx="3" fill="var(--color-ink)" />
            <circle cx={x - 20} cy={ROAD_Y - 22} r="4" fill={c} />
          </g>
        )
      })}
      {/* blocked boxes */}
      {JX.map((x, j) => sim.blocked[j] && (
        <g key={`b${x}`}>
          <rect x={x - 14} y={ROAD_Y - 14} width="28" height="28" fill="var(--color-critical)" opacity=".18" stroke="var(--color-critical)" strokeWidth="2" />
          <text x={x + 16} y={ROAD_Y - 18} fontSize="10" fontWeight="800" fill="var(--color-critical)">BLOCKED</text>
        </g>
      ))}
      {highlight !== null && highlight !== undefined && (
        <circle cx={JX[highlight]} cy={ROAD_Y} r="30" fill="none" stroke="var(--color-ink)" strokeWidth="2.5" strokeDasharray="5 4" />
      )}
      {/* storage bars */}
      {[0, 1, 2].map(j => {
        const x0 = JX[j] + 18
        const x1 = (j < 2 ? JX[j + 1] : EXIT_X) - 18
        const occ = occupancy(sim, j)
        const f = Math.min(1, occ / P.storage[j])
        const col = f >= 0.95 ? 'var(--color-critical)' : f >= 0.7 ? 'var(--color-warning)' : 'var(--color-good)'
        return (
          <g key={`st${j}`}>
            <rect x={x0} y="108" width={x1 - x0} height="7" rx="3.5" fill="var(--color-gridline)" />
            <rect x={x0} y="108" width={Math.max(0, (x1 - x0) * f)} height="7" rx="3.5" fill={col} />
            <text x={x1} y="104" textAnchor="end" fontSize="10" fill="var(--color-ink-2)" className="tabular-nums">
              road ahead {occ}/{P.storage[j]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const METRICS = [
  { key: 'delay', label: 'Avg delay per vehicle', unit: 's', better: 'low', fmt: v => v.toFixed(0) },
  { key: 'tripAC', label: 'A → C trip time', unit: 's', better: 'low', fmt: v => v.toFixed(0) },
  { key: 'maxQ', label: 'Longest queue', unit: 'veh', better: 'low', fmt: v => v },
  { key: 'spill', label: 'Spillback events', unit: '', better: 'low', fmt: v => v },
  { key: 'wastedPerHour', label: 'Green wasted into full roads', unit: 's/h', better: 'low', fmt: v => Math.round(v) },
  { key: 'vpm', label: 'Vehicles per minute', unit: '', better: 'high', fmt: v => v.toFixed(1) },
  { key: 'sideMax', label: 'Longest side-street wait', unit: 's', better: 'low', fmt: v => v },
]

const Corridor3D = lazy(() => import('../components/three/Corridor3D'))

const makeWorld = () => ({ stream: createArrivalStream(SEED), sims: CONTROLLERS.map(c => createSim(c.key)) })

const fmtTime = s => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':')

export default function ControlRoom() {
  const demo = useDemo()
  const [preset, setPreset] = useState('blocked')
  const [cfg, setCfg] = useState(SCENARIOS.blocked)
  const [speed, setSpeed] = useState(60)
  const [running, setRunning] = useState(true)
  const [explain, setExplain] = useState(null)
  const [view, setView] = useState(() => (hasWebGL() ? '3d' : '2d'))
  const [, setFrame] = useState(0)
  // The three lane simulations are mutable objects stepped by the animation loop; `frame` re-renders them.
  const [world, setWorld] = useState(makeWorld)

  // Diverted traffic from the event loaded in the Disruption Console.
  const ev = demo.ev
  const extra = ev && demo.status.key === 'active' ? Math.round(demo.split * ev.corridorExtraVph * inflowProfile(ev, demo.status.t)) : 0
  const corridor = ev ? { name: ev.corridor, city: ev.city, junctions: ev.junctions } : DEFAULT_CORRIDOR
  const live = { ...cfg, main: cfg.main + extra }
  const liveRef = useRef(live)
  useEffect(() => { liveRef.current = live })

  const restart = useCallback(next => {
    setWorld(makeWorld())
    if (next) setCfg(next)
    setExplain(null)
  }, [])

  const viewRef = useRef(view)
  useEffect(() => { viewRef.current = view })
  // The 3D view scales car acceleration to the simulation speed; it reads it through a stable getter.
  const speedRef = useRef(speed)
  useEffect(() => { speedRef.current = speed })
  const getSpeed = useCallback(() => speedRef.current, [])

  useEffect(() => {
    if (!running) return
    let raf
    let last = performance.now()
    let lastUi = 0
    let acc = world.frac ?? 0
    const loop = now => {
      acc += ((now - last) / 1000) * speed
      last = now
      const n = Math.min(240, Math.floor(acc))
      acc = Math.min(acc - n, 0.999)
      for (let i = 0; i < n; i++) world.sims.forEach(s => step(s, world.stream, liveRef.current))
      world.frac = acc // the 3D view interpolates moving cars between whole simulated seconds
      // The 3D scene animates itself every frame; the text around it only needs ~8 updates a second.
      if (n && (viewRef.current === '2d' || now - lastUi > 120)) {
        lastUi = now
        setFrame(f => f + 1)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running, speed, world])

  const stats = world.sims.map(s => summarize(s))
  const t = world.sims[0].t

  const pauseAndExplain = () => {
    if (explain) { setExplain(null); setRunning(true); return }
    setRunning(false)
    const ad = world.sims[1]
    const blocked = ad.blocked.findIndex(Boolean)
    const j = blocked >= 0 ? blocked : [0, 1, 2].reduce((a, k) => (occupancy(ad, k) / P.storage[k] > occupancy(ad, a) / P.storage[a] ? k : a), 0)
    setExplain({ j, blocked: blocked >= 0 })
  }

  const ex = explain && (() => {
    const ad = world.sims[1]
    const fg = world.sims[2]
    const j = explain.j
    return {
      ad: `${JUNCTIONS[j]} · ${corridor.junctions[j]}: ${explain.blocked ? 'green, but the' : 'the'} road ahead holds ${occupancy(ad, j)}/${P.storage[j]} cars. ${explain.blocked ? 'Nobody can move, so this green is wasted while' : 'It will block soon, and meanwhile'} ${ad.sideQ[j].length} side-street car${ad.sideQ[j].length === 1 ? '' : 's'} wait${ad.sideQ[j].length === 1 ? 's' : ''}.`,
      fg: `Same cars, same second. FlowGuard knows the road ahead is ${occupancy(fg, j)}/${P.storage[j]} full, so it ${fg.sig[j].phase === 'main' ? 'keeps main green only while there is space' : 'gives the green to the side street instead'}.`,
    }
  })()

  return (
    <div className="grid gap-4">
      <Card
        title="Corridor Control Room"
        hint={`${corridor.name} · ${corridor.city} · schematic, not to scale · same cars in all three lanes (seed ${SEED})`}
      >
        <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="grid gap-1">
            <span className="text-xs text-ink-2">Scenario preset</span>
            <Segmented
              label="Scenario"
              value={preset}
              onChange={k => { setPreset(k); restart(SCENARIOS[k]) }}
              options={Object.entries(SCENARIOS).map(([k, s]) => ({ value: k, label: s.label }))}
            />
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-ink-2">Speed</span>
            <Segmented label="Speed" value={speed} onChange={setSpeed} options={[1, 10, 60].map(v => ({ value: v, label: `${v}×` }))} />
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-ink-2">View</span>
            <Segmented label="View" value={view} onChange={setView} options={[{ value: '3d', label: '3D' }, { value: '2d', label: '2D' }]} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { setExplain(null); setRunning(r => !r) }}>{running ? '❚❚ Pause' : '▶ Run'}</Button>
            <Button onClick={() => restart()}>↺ Restart</Button>
            <Button variant={explain ? 'primary' : 'default'} onClick={pauseAndExplain}>{explain ? 'Resume' : '⏸ Pause and explain'}</Button>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-ink-2">Simulated time</div>
            <div className="text-lg font-bold tabular-nums">{fmtTime(t)}</div>
          </div>
        </div>

        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <Slider id="sMain" label="Main-road demand" value={cfg.main} min={400} max={1300} step={10} onChange={v => setCfg(c => ({ ...c, main: v }))} format={v => `${v} veh/h`} />
          <Slider id="sSide" label="Side-street demand (each)" value={cfg.side} min={100} max={500} step={10} onChange={v => setCfg(c => ({ ...c, side: v }))} format={v => `${v} veh/h`} />
          <Slider id="sExit" label="Downstream signal D green" value={cfg.exitGreen} min={25} max={70} onChange={v => setCfg(c => ({ ...c, exitGreen: v }))} format={v => `${v} s / 90 s`} />
        </div>

        {extra > 0 && (
          <div className="mb-3 rounded-lg border border-critical/40 bg-critical/5 px-3 py-2 text-[13px]">
            <b>Closure active:</b> {ev.name}. +{extra} veh/h diverted onto this corridor at a {Math.round(demo.split * 100)}% split (from the Disruption Console).
          </div>
        )}

        {view === '3d' ? (
          <div className="grid gap-2">
            <div className="grid gap-2 sm:grid-cols-3">
              {CONTROLLERS.map((c, i) => (
                <div key={c.key} className="rounded-lg border border-black/10 px-3 py-2 text-[13px]">
                  <b className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-full" style={{ background: CTRL_COLOR[c.key] }} />{c.label}</b>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-2">
                    <span>delay <b className="tabular-nums text-ink">{stats[i].delay.toFixed(0)} s</b>/veh</span>
                    <span>green wasted <b className="tabular-nums text-ink">{Math.round(stats[i].wastedPerHour)} s/h</b></span>
                    <span>spillbacks <b className="tabular-nums text-ink">{stats[i].spill}</b></span>
                  </div>
                </div>
              ))}
            </div>
            <Suspense fallback={<div className="grid h-[380px] place-items-center rounded-lg bg-land text-xs text-muted">Loading 3D view…</div>}>
              <Corridor3D world={world} getSpeed={getSpeed} names={corridor.junctions} highlight={explain ? explain.j : null} />
            </Suspense>
            {ex && <p className="rounded-md bg-critical/8 px-2 py-1 text-[13px]"><b>Local adaptive:</b> {ex.ad}</p>}
            {ex && <p className="rounded-md bg-accent/8 px-2 py-1 text-[13px]"><b>FlowGuard:</b> {ex.fg}</p>}
            <p className="text-[11px] text-muted">Drag to rotate (desktop). Red glowing box = green light into a full road. Bars beside each link show how full the road ahead is.</p>
          </div>
        ) : (
        <div className="grid gap-2">
          {CONTROLLERS.map((c, i) => (
            <div key={c.key} className={`rounded-lg border px-3 pt-2 ${explain && i > 0 ? 'border-ink/40' : 'border-black/10'}`}>
              <div className="flex flex-wrap items-baseline gap-x-4 text-[13px]">
                <b className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-full" style={{ background: CTRL_COLOR[c.key] }} />{c.label}</b>
                <span className="text-ink-2">delay <b className="tabular-nums text-ink">{stats[i].delay.toFixed(0)} s</b>/veh</span>
                <span className="text-ink-2">green wasted <b className="tabular-nums text-ink">{Math.round(stats[i].wastedPerHour)} s/h</b></span>
                <span className="text-ink-2">spillbacks <b className="tabular-nums text-ink">{stats[i].spill}</b></span>
              </div>
              <Lane sim={world.sims[i]} names={corridor.junctions} highlight={explain && i > 0 ? explain.j : null} />
              {ex && i === 1 && <p className="mb-2 rounded-md bg-critical/8 px-2 py-1 text-[13px]"><b>Local adaptive:</b> {ex.ad}</p>}
              {ex && i === 2 && <p className="mb-2 rounded-md bg-accent/8 px-2 py-1 text-[13px]"><b>FlowGuard:</b> {ex.fg}</p>}
            </div>
          ))}
        </div>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-2">
          <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-2.5 rounded-sm bg-ink-2" />Queued car</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-2.5 rounded-sm bg-accent/75" />Moving car</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-2.5 rounded-sm bg-c-geo" />Side-street car</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block size-2 rounded-full bg-good" />Main green · <i className="inline-block size-2 rounded-full bg-critical" />Side green</span>
        </div>
      </Card>

      <Card title="Live scoreboard" hint="Since the last restart · best value in each row marked ✓">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-[13px]">
            <thead>
              <tr className="text-left text-xs text-ink-2">
                <th className="border-b border-gridline py-1.5 pr-2 font-semibold">Metric</th>
                {CONTROLLERS.map(c => (
                  <th key={c.key} className="border-b border-gridline px-1.5 py-1.5 text-right font-semibold sm:px-2">
                    <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-full" style={{ background: CTRL_COLOR[c.key] }} /><span className="sm:hidden">{CTRL_SHORT[c.key]}</span><span className="hidden sm:inline">{c.label}</span></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map(m => {
                const vals = stats.map(s => s[m.key])
                const best = m.better === 'low' ? Math.min(...vals) : Math.max(...vals)
                return (
                  <tr key={m.key}>
                    <td className="border-b border-gridline py-1.5 pr-2 text-ink-2">{m.label}{m.unit && <span className="text-muted"> ({m.unit})</span>}</td>
                    {vals.map((v, i) => (
                      <td key={i} className={`whitespace-nowrap border-b border-gridline px-1.5 py-1.5 text-right tabular-nums sm:px-2 ${v === best && t > 60 ? 'font-bold' : ''}`}>
                        {m.fmt(v)} {v === best && t > 60 ? '✓' : ''}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          <SimTag className="mr-1" /> Engine is a simplified queue model built for this demo (2 s saturation headway, 3 s all-red, fixed link storage). Uncalibrated.
        </p>
      </Card>
    </div>
  )
}
