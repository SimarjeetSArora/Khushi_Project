import { useEffect, useState } from 'react'
import { TooltipProvider } from './components/Tooltip'
import { Button, EVENT_STATUS, SimTag, StatusChip } from './components/ui'
import { clockLabel } from './engine/events'
import { DemoProvider, useDemo } from './engine/store'
import CommuterView from './screens/CommuterView'
import ControlRoom from './screens/ControlRoom'
import DisruptionConsole from './screens/DisruptionConsole'
import FleetBoard from './screens/FleetBoard'
import PilotImpact from './screens/PilotImpact'

const TABS = [
  { id: 'control', label: 'Corridor Control Room', who: 'Traffic engineers', Screen: ControlRoom },
  { id: 'console', label: 'Disruption Console', who: 'Traffic police', Screen: DisruptionConsole },
  { id: 'fleet', label: 'Fleet Delivery-Risk', who: 'Delivery operators', Screen: FleetBoard },
  { id: 'commuter', label: 'Commuter ETA', who: 'Drivers', Screen: CommuterView },
  { id: 'impact', label: 'Pilot Impact', who: 'Mappls & city', Screen: PilotImpact },
]

const tabFromHash = () => TABS.find(t => `#/${t.id}` === window.location.hash)?.id ?? 'control'

function EventIndicator() {
  const { ev, status, clock, playing, dispatch } = useDemo()
  if (!ev) return <span className="text-xs text-muted">No event loaded</span>
  const st = EVENT_STATUS[status.key]
  return (
    <div className="flex items-center gap-2">
      <StatusChip color={st.color} icon={st.icon} label={`${status.label}: ${ev.city} ${ev.kind.toLowerCase()} closure`} />
      <span className="text-xs tabular-nums text-ink-2">{clockLabel(clock)}</span>
      <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'play', playing: !playing })} aria-label={playing ? 'Pause demo clock' : 'Run demo clock'}>
        {playing ? '❚❚' : '▶'}
      </Button>
    </div>
  )
}

function Shell() {
  const [tab, setTab] = useState(tabFromHash)
  const { dispatch } = useDemo()
  useEffect(() => {
    const on = () => setTab(tabFromHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const { Screen } = TABS.find(t => t.id === tab)

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-black/10 bg-surface">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-2.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-7 place-items-center rounded-lg bg-accent" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M1 12 L5 6 L8 9 L11 3 L15 8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div>
              <h1 className="text-[17px] font-bold tracking-tight">FlowGuard <span className="font-normal text-ink-2">· Round 3 demo</span></h1>
              <div className="text-xs text-ink-2">One forecast engine · five dashboards · no live Mappls connection</div>
            </div>
            <SimTag>⚠ Simulated data</SimTag>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <EventIndicator />
            <Button size="sm" onClick={() => dispatch({ type: 'reset' })}>↺ Reset demo</Button>
          </div>
        </div>
        <nav aria-label="Dashboards" className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 sm:px-5">
          {TABS.map((t, i) => (
            <a
              key={t.id}
              href={`#/${t.id}`}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-[13px] ${tab === t.id ? 'border-accent font-semibold text-ink' : 'border-transparent text-ink-2 hover:text-ink'}`}
            >
              <span className="mr-1.5 tabular-nums text-muted">{i + 1}</span>{t.label}
              <span className="ml-1.5 hidden text-[11px] text-muted lg:inline">· {t.who}</span>
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 pb-8 pt-4 sm:px-5">
        <Screen />
      </main>

      <footer className="mx-auto max-w-[1600px] px-4 pb-6 text-[11.5px] text-muted sm:px-5">
        All figures are simulated by a simplified engine built for this demo and are uncalibrated. Event cards are written from real events; FlowGuard was not used in them.
        Delivery orders are sample data; bypass and approach times are assumed.
      </footer>
    </>
  )
}

export default function App() {
  return (
    <DemoProvider>
      <TooltipProvider>
        <Shell />
      </TooltipProvider>
    </DemoProvider>
  )
}
