// Closure / diversion model used by the Disruption Console, Fleet Board and Commuter view.
// s = share of diverted traffic sent via the alternative corridor (0–1); the rest takes the bypass.
// Curves are ASSUMED and uncalibrated; shapes follow the pitch: residents' delay 18 s → 200 s,
// diverted trips fastest at a 50–75% split.

export const residentDelay = (s, replanned = false) => 18 + 182 * (replanned ? 0.6 : 1) * s ** 3 // s per vehicle
export const corridorTrip = s => 14 + 10 * s ** 3 // min, diverted driver via corridor
export const bypassTrip = s => 22 + 6 * (1 - s) ** 2 // min, diverted driver via bypass
export const divertedTrip = s => s * corridorTrip(s) + (1 - s) * bypassTrip(s) // min, average diverted driver

export const SPLITS = Array.from({ length: 101 }, (_, i) => i / 100)
export const BEST_SPLIT = SPLITS.reduce((a, s) => (divertedTrip(s) < divertedTrip(a) ? s : a), 0)
export const FAST_BAND = [0.5, 0.75]

// Share (0–1) of the full diverted volume arriving on the corridor, t minutes after the closure starts.
export function inflowProfile(ev, t) {
  if (!ev || t < 0) return 0
  const ramp = ev.kind === 'Planned' ? 1 - Math.exp(-t / 5) : 1 - Math.exp(-t / 9)
  // Unplanned: drivers learn and reroute further upstream, so inflow eases after the first hour.
  const easing = ev.kind === 'Planned' ? 1 : t < 60 ? 1 : Math.max(0.65, 1 - (t - 60) / 150)
  const end = t > ev.duration ? Math.max(0, 1 - (t - ev.duration) / 20) : 1
  return ramp * easing * end
}

// Extra vehicles per 5 minutes on the corridor.
export const extraPer5 = (ev, s, t) => ((s * ev.divertedVph) / 12) * inflowProfile(ev, t)

export function forecastSeries(ev, s, from = -15, to = 150) {
  const out = []
  for (let t = from; t <= to; t += 5) out.push({ t, v: extraPer5(ev, s, t) })
  return out
}

export function options(s) {
  const pct = x => Math.round(x * 100)
  return [
    {
      id: 'replan',
      title: `Re-plan corridor signals at ${pct(s)}% split`,
      detail: 'RoadSync re-times the corridor junctions for the forecast inflow; split unchanged.',
      delay: residentDelay(s, true),
      trip: divertedTrip(s),
      split: s,
    },
    {
      id: 'split',
      title: `Change split to ${pct(BEST_SPLIT)}%`,
      detail: 'Variable message signs and navigation steer the rest of the traffic to the bypass.',
      delay: residentDelay(BEST_SPLIT),
      trip: divertedTrip(BEST_SPLIT),
      split: BEST_SPLIT,
    },
    {
      id: 'monitor',
      title: 'Monitor only',
      detail: 'No change; keep watching the forecast.',
      delay: residentDelay(s),
      trip: divertedTrip(s),
      split: s,
    },
  ]
}
