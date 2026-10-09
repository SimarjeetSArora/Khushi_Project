import { useCallback, useEffect, useRef, useState } from 'react'
import BeforeAfter from './components/BeforeAfter'
import BottleneckMap from './components/BottleneckMap'
import Header from './components/Header'
import HotspotDetail from './components/HotspotDetail'
import HotspotList from './components/HotspotList'
import IncidentLoop from './components/IncidentLoop'
import TicketDialog from './components/TicketDialog'
import { TooltipProvider } from './components/Tooltip'
import { HOTSPOTS, TIMELINE } from './data'

// Open the app with #preview to jump to the end state of the demo (handy for rehearsal).
const PREVIEW = typeof window !== 'undefined' && window.location.hash === '#preview'

export default function App() {
  const [selId, setSelId] = useState(PREVIEW ? HOTSPOTS[0].id : null)
  const [tickets, setTickets] = useState(PREVIEW ? { silk: { status: 'fixed', ...HOTSPOTS[0].fix, no: 'RP-1041' } } : {}) // id -> ticket
  const [ticketNo, setTicketNo] = useState(PREVIEW ? 1041 : 1040)
  const [dialogHs, setDialogHs] = useState(null)
  const [incident, setIncident] = useState(PREVIEW ? 2 : 0) // 0 none · 1 live · 2 rerouted
  const [step, setStep] = useState(PREVIEW ? TIMELINE.length : 0)
  const [alertOpen, setAlertOpen] = useState(false)
  const [done, setDone] = useState(() => new Set(PREVIEW ? [1, 2, 3, 4, 5] : []))
  const timers = useRef([])

  const markStep = useCallback(n => setDone(d => new Set(d).add(n)), [])
  const hs = HOTSPOTS.find(h => h.id === selId)

  const select = id => {
    setSelId(id)
    const h = HOTSPOTS.find(x => x.id === id)
    if (id === HOTSPOTS[0].id) markStep(1)
    if (h.main !== 'sig' && h.causes.mid > h.causes.sig) markStep(2)
  }

  const createTicket = (id, form) => {
    const no = ticketNo + 1
    setTicketNo(no)
    setTickets(t => ({ ...t, [id]: { status: 'open', ...form, no: `RP-${no}` } }))
    setDialogHs(null)
    markStep(3)
  }

  const markFixed = id => {
    setTickets(t => ({ ...t, [id]: { ...t[id], status: 'fixed' } }))
    setSelId(id)
    markStep(4)
  }

  const triggerIncident = () => {
    setIncident(1)
    markStep(5)
    TIMELINE.forEach((_, i) => {
      timers.current.push(
        setTimeout(() => {
          setStep(i + 1)
          if (i === TIMELINE.length - 1) setAlertOpen(true)
        }, 300 + i * 900),
      )
    })
  }

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const reset = () => {
    clearTimers()
    setSelId(null)
    setTickets({})
    setTicketNo(1040)
    setIncident(0)
    setStep(0)
    setAlertOpen(false)
    setDone(new Set())
    if (window.location.hash) history.replaceState(null, '', window.location.pathname)
  }

  return (
    <TooltipProvider>
      <Header done={done} onReset={reset} />

      <main className="mx-auto grid max-w-[1600px] gap-4 px-4 pb-8 pt-4 sm:px-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_380px]">
          <HotspotList selId={selId} onSelect={select} />
          <BottleneckMap selId={selId} onSelect={select} tickets={tickets} incident={incident} />
          <HotspotDetail
            hs={hs}
            ticket={hs && tickets[hs.id]}
            onSelect={select}
            onCreateTicket={setDialogHs}
            className="md:col-span-2 xl:col-span-1"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
          <BeforeAfter hs={hs || HOTSPOTS[0]} tickets={tickets} onMarkFixed={markFixed} />
          <IncidentLoop
            incident={incident}
            step={step}
            alertOpen={alertOpen}
            onTrigger={triggerIncident}
            onReroute={() => { setIncident(2); setAlertOpen(false) }}
            onIgnore={() => setAlertOpen(false)}
          />
        </div>
      </main>

      <footer className="mx-auto max-w-[1600px] px-4 pb-6 text-[11.5px] text-muted sm:px-5">
        All figures are <b>simulated</b> for demonstration and are not measurements. Place names are real; positions are schematic.
        Assumption used for “after” curves: a completed fix removes ~55% of the delay component it targets.
        Cause classification would come from probe speeds plus street imagery and must be checked on the ground.
      </footer>

      <TicketDialog key={dialogHs?.id ?? 'none'} hs={dialogHs} onClose={() => setDialogHs(null)} onSubmit={createTicket} />
    </TooltipProvider>
  )
}
