import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { EVENTS, clockLabel, eventStatus } from './events'

// One shared state for every dashboard: which event is loaded, the demo clock, the chosen split,
// and the decision log. A closure loaded in the Console shows up at once on every other screen.

const initial = { eventId: null, clock: 0, playing: false, split: 0.5, approved: null, log: [] }

function reducer(state, a) {
  const stamp = clockLabel(state.clock)
  switch (a.type) {
    case 'load': {
      const ev = EVENTS[a.id]
      return {
        ...initial,
        eventId: a.id,
        playing: true,
        log: [{ time: clockLabel(0), text: `${ev.kind} event loaded: ${ev.name}. Source: ${ev.source}.`, tone: 'info' }],
      }
    }
    case 'tick': {
      if (!state.playing || !state.eventId) return state
      const ev = EVENTS[state.eventId]
      const before = eventStatus(ev, state.clock).key
      const clock = state.clock + a.minutes
      const after = eventStatus(ev, clock).key
      const log = before !== after
        ? [...state.log, { time: clockLabel(clock), text: `Event status: ${before} → ${after}.`, tone: after === 'active' ? 'warn' : 'info' }]
        : state.log
      return { ...state, clock, log }
    }
    case 'play':
      return { ...state, playing: a.playing }
    case 'split':
      return { ...state, split: a.split }
    case 'decide': {
      const o = a.option
      if (!a.approve) return { ...state, log: [...state.log, { time: stamp, text: `Rejected: ${o.title}.`, tone: 'info' }] }
      return {
        ...state,
        split: o.split,
        approved: { id: o.id, split: o.split, at: state.clock },
        log: [
          ...state.log,
          { time: stamp, text: `Approved: ${o.title}. Forecast residents' delay ${Math.round(o.delay)} s/veh; diverted trip ${o.trip.toFixed(1)} min.`, tone: 'good' },
        ],
      }
    }
    case 'note':
      return { ...state, log: [...state.log, { time: stamp, text: a.text, tone: a.tone || 'info' }] }
    case 'reset':
      return initial
    default:
      return state
  }
}

const Ctx = createContext(null)

export function DemoProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial)

  // Demo clock: 1 real second = 1 simulated minute (60×).
  useEffect(() => {
    if (!state.playing || !state.eventId) return
    const id = setInterval(() => dispatch({ type: 'tick', minutes: 1 }), 1000)
    return () => clearInterval(id)
  }, [state.playing, state.eventId])

  const value = useMemo(() => {
    const ev = state.eventId ? EVENTS[state.eventId] : null
    const status = eventStatus(ev, state.clock)
    const live = !!ev && status.key !== 'expired'
    return { ...state, ev, status, live, dispatch }
  }, [state])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useDemo = () => useContext(Ctx)
