import { useState } from 'react'
import { Button, Card, SimTag } from '../components/ui'
import { divertedTrip, inflowProfile } from '../engine/closure'
import { clockLabel } from '../engine/events'
import results from '../engine/results.json'
import { useDemo } from '../engine/store'
import { EventPicker } from './DisruptionConsole'

const TRIPS = {
  'missing-link': { from: 'Khopoli', to: 'Pune Station', normal: 75, reach: 20 },
  puja: { from: 'Howrah', to: 'Gariahat', normal: 38, reach: 12 },
}

// FlowGuard forecast (min) for a driver leaving `depart` minutes from now: the closure delay
// depends on how much diverted traffic is on the corridor when the driver reaches it.
function forecast(ev, split, status, depart) {
  const trip = TRIPS[ev.id]
  const tAtZone = status.t + depart + trip.reach
  const load = inflowProfile(ev, tAtZone)
  if (tAtZone < 0) return trip.normal
  return trip.normal + 6 + (20 + (divertedTrip(split) - 14) * 3) * load
}

function Phone({ ev, status, split, revealed }) {
  const trip = ev ? TRIPS[ev.id] : { from: 'Khopoli', to: 'Pune Station', normal: 75 }
  const fg = ev ? forecast(ev, split, status, 0) : trip.normal
  const actual = fg + 1.4 // shown after the trip: the simulated outcome
  return (
    <div className="relative h-[560px] w-[280px] flex-none overflow-hidden rounded-[38px] border-[10px] border-[#111] bg-[#e9eef3]" aria-label="Driver phone mock-up">
      <div className="absolute left-1/2 top-0 z-30 h-5 w-24 -translate-x-1/2 rounded-b-xl bg-[#111]" />
      <svg viewBox="0 0 260 540" className="absolute inset-0 size-full">
        <rect width="260" height="540" fill="#e9eef3" />
        {[['M -10 160 L 270 140', 6], ['M 60 0 L 80 540', 5], ['M 0 420 L 270 380', 5]].map(([d, w]) => <path key={d} d={d} stroke="#fff" strokeWidth={w} fill="none" />)}
        <path d="M 180 120 C 170 250 200 330 150 500" stroke={ev ? '#9aa4ae' : '#2a78d6'} strokeWidth="7" fill="none" strokeLinecap="round" />
        {ev && <path d="M 180 120 L 90 170 L 80 330 L 150 500" stroke="#2a78d6" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        {ev && <g><circle cx="188" cy="270" r="12" fill="#d03b3b" stroke="#fff" strokeWidth="2" /><text x="188" y="275" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">!</text></g>}
        <circle cx="180" cy="120" r="8" fill="#fff" stroke="#2a78d6" strokeWidth="4" />
      </svg>
      <div className="absolute inset-x-3 top-8 z-20 rounded-xl bg-[#0d366b] px-3 py-2.5 text-xs text-white">
        <div className="text-[11px] opacity-80">{trip.from} → {trip.to}</div>
        <b className="block text-base">ETA {Math.round(fg)} min</b>
        {ev ? 'Rerouted via the corridor' : 'Fastest route'}
      </div>
      {ev && (
        <div className="absolute inset-x-3 top-[118px] z-20 rounded-xl bg-[#d03b3b] px-3 py-2 text-xs text-white">
          <b className="block text-[13px]">⚠ Closure {status.key === 'upcoming' ? `in ${-status.t} min` : 'ahead'}</b>
          {ev.closed}
          <div className="mt-0.5 text-[10px] opacity-90">Source: {ev.source}</div>
        </div>
      )}
      <SimTag className="absolute left-1/2 top-[190px] z-20 -translate-x-1/2 text-[9px]" />
      <div className="absolute inset-x-3 bottom-3 z-20 rounded-2xl bg-white p-3 text-xs text-[#0b0b0b] shadow-[0_6px_20px_rgba(0,0,0,.25)]">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-[#f3f2ee] p-2">
            <div className="text-[10px] text-[#52514e]">Last-trip estimate</div>
            <b className="text-lg">{trip.normal} min</b>
          </div>
          <div className="rounded-lg bg-[#cde2fb] p-2">
            <div className="text-[10px] text-[#0d366b]">FlowGuard forecast</div>
            <b className="text-lg text-[#0d366b]">{Math.round(fg)} min</b>
          </div>
        </div>
        {revealed && ev && (
          <div className="mt-2 rounded-lg border border-[#0ca30c] p-2 text-center">
            Actual trip: <b>{Math.round(actual)} min</b> · FlowGuard off by {Math.abs(actual - fg).toFixed(1)} min, last-trip estimate off by {Math.round(actual - trip.normal)} min
          </div>
        )}
      </div>
    </div>
  )
}

export default function CommuterView() {
  const { ev, status, split } = useDemo()
  const [revealed, setRevealed] = useState(false)
  const surge = results.scenarios.surge.adaptive
  // Departure advice: compare time on the road for leaving now, or in 15 / 30 / 45 min.
  const options = ev ? [0, 15, 30, 45].map(d => ({ d, travel: forecast(ev, split, status, d) })) : []
  const travelNow = options[0]?.travel ?? 0
  const best = options.reduce((a, o) => (!a || o.travel < a.travel ? o : a), null)
  const advice = !ev ? null : best.d === 0 || travelNow - best.travel < 3
    ? 'Leave now: waiting will not shorten the trip.'
    : `Leave in ${best.d} min to save ${Math.round(travelNow - best.travel)} min on the road.`

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="justify-self-center"><Phone ev={ev} status={status} split={split} revealed={revealed} /></div>
      <div className="grid content-start gap-4">
        <Card title="Commuter ETA view" right={<SimTag>Mock-up</SimTag>} hint="What a driver on Mappls navigation would see when a closure starts ahead">
          {!ev ? (
            <>
              <p className="mb-3 text-[13px]">No closure loaded. Load an event to see the closure banner, the two ETAs and departure advice.</p>
              <EventPicker compact />
            </>
          ) : (
            <div className="grid gap-3 text-[13px]">
              <div>
                <b>Closure ahead:</b> {ev.closed} ({status.label.toLowerCase()}, now {clockLabel(status.t + ev.startsIn)}).
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface-2 p-3">
                  <div className="text-xs text-ink-2">Last-trip estimate</div>
                  <div className="text-2xl font-bold">{TRIPS[ev.id].normal} min</div>
                  <div className="text-[11px] text-muted">Trips finished before the closure; learns too late</div>
                </div>
                <div className="rounded-lg bg-accent/10 p-3">
                  <div className="text-xs text-ink-2">FlowGuard forecast</div>
                  <div className="text-2xl font-bold">{Math.round(travelNow)} min</div>
                  <div className="text-[11px] text-muted">Queues and diverted inflow on the route ahead</div>
                </div>
              </div>
              <div className="rounded-lg border border-black/10 p-3"><b>Departure advice:</b> {advice}</div>
              <div>
                <Button onClick={() => setRevealed(r => !r)}>{revealed ? 'Hide actual time' : 'Reveal actual time'}</Button>
              </div>
            </div>
          )}
        </Card>
        <Card title="Why it matters" hint={`From the engine's 20-seed surge runs (seeds ${results.seeds[0]}–${results.seeds[1]}), corridor A → C trips`}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-2 p-3">
              <div className="text-2xl font-bold">{Math.round(surge.etaNaive)} s</div>
              <div className="text-xs text-ink-2">avg ETA error, last-trip estimate</div>
            </div>
            <div className="rounded-lg bg-surface-2 p-3">
              <div className="text-2xl font-bold text-good-text">{Math.round(surge.etaQA)} s</div>
              <div className="text-xs text-ink-2">avg ETA error, queue-aware forecast</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted"><SimTag className="mr-1" />Uncalibrated. The demo trip figures on this screen are illustrative.</p>
        </Card>
      </div>
    </div>
  )
}
