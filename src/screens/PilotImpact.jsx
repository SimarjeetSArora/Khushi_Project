import { tipHandlers, useTooltip } from '../components/Tooltip'
import { Card, SimTag, Stat, StatusChip } from '../components/ui'
import { CONTROLLERS } from '../engine/corridor'
import results from '../engine/results.json'
import { CTRL_COLOR } from '../theme'

const ORDER = ['normal', 'surge', 'blocked', 'closure']

// Proposed gates — edit to match the pitch deck.
const GATES = [
  {
    phase: 'Phase 1 · Offline replay',
    test: 'Replay 4 weeks of one corridor’s probe and signal logs through RoadSync.',
    pass: 'Queue-aware ETA error beats the current ETA by ≥ 30% on real data; spillback detection agrees with engineers.',
  },
  {
    phase: 'Phase 2 · Shadow mode',
    test: 'RoadSync advises in the control room; engineers decide. No signal changes.',
    pass: '≥ 70% of advisories accepted; no advised plan raises the worst side-street wait above 120 s.',
  },
  {
    phase: 'Phase 3 · Live corridor pilot',
    test: 'RoadSync re-times one corridor in peak hours against matched control days.',
    pass: 'Measured vehicle-hours saved > 0 on real data; no safety incidents; city agrees to renew.',
  },
]

function SavedBars() {
  const tooltip = useTooltip()
  const max = Math.max(...ORDER.map(k => results.scenarios[k].savedVehHours))
  return (
    <div className="grid gap-3">
      {ORDER.map(k => {
        const s = results.scenarios[k]
        return (
          <div key={k} className="grid grid-cols-[150px_1fr] items-center gap-3">
            <span className="text-[13px] text-ink-2">{s.label}</span>
            <div
              className="flex items-center gap-2"
              {...tipHandlers(tooltip, (
                <>
                  <b>{s.label}</b><br />
                  Saved {s.savedVehHours} veh-h per corridor-hour<br />
                  <span className="text-ink-2">Local adaptive {s.adaptive.vehHours} → RoadSync {s.roadsync.vehHours} veh-h of waiting</span>
                </>
              ))}
            >
              <div className="h-6 rounded-r" style={{ width: `${Math.max(1, (s.savedVehHours / max) * 85)}%`, background: 'var(--color-accent)' }} />
              <b className="whitespace-nowrap text-[13px] tabular-nums">≈ {s.savedVehHours}</b>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PilotImpact() {
  const sc = results.scenarios
  const surge = sc.surge
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat value={`≈ ${surge.savedVehHours}`} label="Vehicle-hours saved per corridor-hour" sub="Evening surge, RoadSync vs local adaptive" tone="good" />
        <Stat value={`${Math.round(surge.adaptive.spill)} → ${Math.round(surge.roadsync.spill)}`} label="Spillback events per hour" sub="Evening surge" />
        <Stat value={`${Math.round(surge.adaptive.sideMax)} → ${Math.round(surge.roadsync.sideMax)} s`} label="Worst side-street wait" sub="Evening surge" />
        <Stat value={`${Math.round(surge.adaptive.etaNaive)} → ${Math.round(surge.adaptive.etaQA)} s`} label="ETA error, A → C" sub="Last-trip estimate → queue-aware" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title="Vehicle-hours saved by scenario" right={<SimTag>Simulated, uncalibrated</SimTag>} hint={`Per corridor-hour · mean of 20 seeds (${results.seeds[0]}–${results.seeds[1]}) · RoadSync vs local adaptive`}>
          <SavedBars />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-xs">
              <thead>
                <tr className="text-left text-ink-2">
                  <th className="border-b border-gridline py-1 pr-2 font-semibold">Green wasted into full roads (s/h)</th>
                  {CONTROLLERS.map(c => (
                    <th key={c.key} className="border-b border-gridline px-2 py-1 text-right font-semibold">
                      <span className="inline-flex items-center gap-1"><i className="inline-block size-2 rounded-full" style={{ background: CTRL_COLOR[c.key] }} />{c.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ORDER.map(k => (
                  <tr key={k}>
                    <td className="border-b border-gridline py-1 pr-2 text-ink-2">{sc[k].label}</td>
                    {CONTROLLERS.map(c => <td key={c.key} className="border-b border-gridline px-2 py-1 text-right tabular-nums">{Math.round(sc[k][c.key].wastedPerHour)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Pilot phases and gates" right={null} hint="Each phase must pass its gate before the next starts">
          <ol className="grid gap-2">
            {GATES.map((g, i) => (
              <li key={g.phase} className="grid grid-cols-[28px_1fr] gap-3 rounded-lg border border-black/10 p-3">
                <span className="grid size-7 place-items-center rounded-full bg-surface-2 text-[13px] font-bold">{i + 1}</span>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b className="text-[13px]">{g.phase}</b>
                    <StatusChip color="var(--color-muted)" icon="◷" label="Not started" />
                  </div>
                  <div className="mt-1 text-xs text-ink-2">{g.test}</div>
                  <div className="mt-1 text-xs"><b>Gate:</b> {g.pass}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card title="Before / after on a real corridor" right={null}>
        <div className="grid min-h-40 place-items-center rounded-lg border-2 border-dashed border-axis bg-surface-2 p-6 text-center">
          <div>
            <div className="text-[15px] font-semibold">Real corridor data goes here</div>
            <div className="mt-1 text-[13px] text-ink-2">Empty until Phase 1 data arrives. Every number above must be re-earned on that data.</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
