// Scripted events for the demo. Written from real events; FlowGuard was not used in either.
// Volumes, durations and bypass times are ASSUMED values.

export const EVENTS = {
  'missing-link': {
    id: 'missing-link',
    name: 'Landslide closure: Missing Link section',
    kind: 'Unplanned',
    city: 'Pune',
    source: 'Incident feed, then police notice',
    basedOn: 'the 6 Jul 2026 Missing Link closure',
    closed: 'Mumbai–Pune Expressway, Missing Link section',
    corridor: 'Old Mumbai–Pune Hwy (NH-48) via Lonavala',
    bypass: 'Ghat bypass (assumed)',
    junctions: ['Khandala', 'Lonavala', 'Valvan'],
    confidence: 'High · verified by police',
    startsIn: 2, // minutes from load until the closure takes effect (verification lag)
    duration: 240, // minutes
    divertedVph: 2400, // vehicles/h needing another route (assumed)
    corridorExtraVph: 320, // extra main-road demand on the Control Room corridor at a 100% split (assumed)
  },
  puja: {
    id: 'puja',
    name: 'Durga Puja road closure',
    kind: 'Planned',
    city: 'Kolkata',
    source: 'Kolkata Police traffic notice',
    basedOn: 'the Kolkata Puja traffic notice',
    closed: 'Pandal-zone arterial (closed to vehicles)',
    corridor: 'Parallel arterial (schematic)',
    bypass: 'Ring-road bypass (assumed)',
    junctions: ['Junction A', 'Junction B', 'Junction C'],
    confidence: 'Confirmed notice',
    startsIn: 10, // 10-minute early warning
    duration: 720,
    divertedVph: 1600,
    corridorExtraVph: 260,
  },
}

export const DEFAULT_CORRIDOR = {
  name: 'Old Mumbai–Pune Hwy (NH-48) via Lonavala',
  city: 'Pune',
  junctions: ['Khandala', 'Lonavala', 'Valvan'],
}

// Demo clock: the console starts at 10:00 on 10 Oct 2026.
export const DEMO_START_MIN = 10 * 60
export const clockLabel = min => {
  const m = Math.round(DEMO_START_MIN + min)
  const h = Math.floor(m / 60) % 24
  return `${String(h).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`
}

export function eventStatus(ev, clock) {
  if (!ev) return null
  const t = clock - ev.startsIn
  if (t < 0) return { key: 'upcoming', label: 'Upcoming', t }
  if (t < ev.duration) return { key: 'active', label: 'Active', t }
  return { key: 'expired', label: 'Expired', t }
}
