// All figures are SIMULATED for the pitch demo. Place names are real; positions are schematic.

export const CAUSES = [
  { key: 'mid', label: 'Mid-block friction', color: 'var(--color-c-mid)' },
  { key: 'sig', label: 'Signal delay', color: 'var(--color-c-sig)' },
  { key: 'geo', label: 'Road geometry', color: 'var(--color-c-geo)' },
  { key: 'inc', label: 'Incident-prone', color: 'var(--color-c-inc)' },
]
export const CAUSE_TEXT = { mid: 'mid-block', sig: 'at the signal', geo: 'from road geometry', inc: 'from incidents' }

export const DEPARTMENTS = [
  'Traffic Police (BTP)',
  'BBMP Enforcement',
  'BBMP Roads',
  'BBMP Storm-water Drains',
  'BMTC',
  'BTP Signal Cell',
]

// len = stretch length (km); ff = free-flow travel time (min); am / pm = peak travel time (min)
// delay = vehicle-hours lost per day; x, y = position on the schematic map
export const HOTSPOTS = [
  {
    id: 'silk', name: 'Silk Board Jn → HSR (ORR)', x: 262, y: 362, len: 2.1, ff: 4, am: 14, pm: 19, delay: 4120,
    causes: { mid: 62, sig: 21, geo: 12, inc: 5 }, main: 'mid',
    finding: 'Buses stop on the carriageway outside the bay; two-wheelers park at the service-road merge.',
    scene: ['bus', 'parked', 'parked', 'signal'],
    reports: [
      ['18:42', 'Mappls app', 'Buses blocking 2 lanes near HSR bus stop'],
      ['18:10', 'Mappls app', 'Bikes parked on service road exit'],
      ['Yesterday', 'Citizen Connect', 'Daily jam before Silk Board, not at the light'],
    ],
    fix: { dept: 'Traffic Police (BTP)', action: 'Enforce bus-bay use; clear two-wheeler parking at merge', window: 'Weekdays 5–9 pm' },
  },
  {
    id: 'mara', name: 'Marathahalli Bridge (ORR)', x: 452, y: 250, len: 1.8, ff: 3.5, am: 11, pm: 16, delay: 3560,
    causes: { mid: 71, sig: 9, geo: 14, inc: 6 }, main: 'mid',
    finding: 'Vendor carts and waiting autos occupy the left lane under the bridge.',
    scene: ['vendor', 'vendor', 'parked', 'parked'],
    reports: [
      ['19:05', 'Mappls app', 'Left lane blocked by carts'],
      ['17:48', 'Mappls app', 'Autos waiting under bridge'],
      ['2 days ago', 'Citizen Connect', 'Footpath fully encroached'],
    ],
    fix: { dept: 'BBMP Enforcement', action: 'Relocate vendor carts; mark no-stopping zone under bridge', window: 'Daily 4–10 pm' },
  },
  {
    id: 'krp', name: 'KR Puram – Tin Factory', x: 470, y: 148, len: 1.6, ff: 3, am: 12, pm: 10, delay: 3010,
    causes: { mid: 58, sig: 14, geo: 20, inc: 8 }, main: 'mid',
    finding: 'Private buses pick up passengers mid-road on the junction approach.',
    scene: ['bus', 'bus', 'parked', 'signal'],
    reports: [
      ['08:52', 'Mappls app', 'Buses stopping in middle lane'],
      ['08:20', 'Mappls app', 'Pedestrians crossing between buses'],
      ['Last week', 'Citizen Connect', 'Need a proper pickup bay'],
    ],
    fix: { dept: 'Traffic Police (BTP)', action: 'Designate pickup bay 150 m upstream; enforce with RTO', window: 'Weekdays 7–11 am' },
  },
  {
    id: 'heb', name: 'Hebbal Flyover loop', x: 250, y: 62, len: 2.4, ff: 4, am: 13, pm: 11, delay: 2480,
    causes: { mid: 18, sig: 12, geo: 61, inc: 9 }, main: 'geo',
    finding: 'Three lanes merge into two on the loop; vehicles weave at the lane drop.',
    scene: ['merge', 'parked'],
    reports: [
      ['09:15', 'Mappls app', 'Everyone merging at the last second'],
      ['Yesterday', 'Mappls app', 'Slow at the loop again'],
      ['Last week', 'Citizen Connect', 'Lane markings faded'],
    ],
    fix: { dept: 'BBMP Roads', action: 'Re-stripe merge; extend acceleration lane by 80 m', window: 'Night works, 11 pm–5 am' },
  },
  {
    id: 'bel', name: 'Bellandur – Sarjapur Rd', x: 412, y: 334, len: 1.5, ff: 3, am: 8, pm: 10, delay: 2140,
    causes: { mid: 24, sig: 10, geo: 8, inc: 58 }, main: 'inc',
    finding: 'Recurring waterlogging at a low point near the lake outlet after rain.',
    scene: ['water', 'pothole', 'pothole'],
    reports: [
      ['Mon 20:30', 'Mappls app', 'Knee-deep water near junction'],
      ['Mon 20:12', 'Mappls app', 'Bikes turning back'],
      ['Last month', 'Citizen Connect', 'Same spot floods every rain'],
    ],
    fix: { dept: 'BBMP Storm-water Drains', action: 'Desilt drain; keep pump on standby during rain alerts', window: 'Before next rain alert' },
  },
  {
    id: 'sony', name: 'Sony World Jn, Koramangala', x: 232, y: 296, len: 0.9, ff: 2, am: 6, pm: 7, delay: 1720,
    causes: { mid: 22, sig: 64, geo: 9, inc: 5 }, main: 'sig',
    finding: 'Signal cycle is long for side-road demand; queues are at the stop line, not mid-block.',
    scene: ['signal', 'queue'],
    reports: [
      ['18:30', 'Mappls app', 'Long wait at red, empty cross road'],
      ['Yesterday', 'Mappls app', 'Signal too long'],
      ['Last week', 'Citizen Connect', 'Phase timing seems fixed'],
    ],
    fix: { dept: 'BTP Signal Cell', action: 'Review phase plan with adaptive-signal vendor (Signal Advisor)', window: 'Next timing review' },
  },
  {
    id: 'itpl', name: 'ITPL Main Rd, Whitefield', x: 562, y: 192, len: 1.9, ff: 3.5, am: 9, pm: 8, delay: 1540,
    causes: { mid: 66, sig: 8, geo: 6, inc: 20 }, main: 'mid',
    finding: 'Three potholes force traffic into one lane over a 400 m stretch.',
    scene: ['pothole', 'pothole', 'pothole'],
    reports: [
      ['09:40', 'Mappls pothole alert', 'Large pothole, left lane'],
      ['08:55', 'Mappls app', 'Cars swerving into right lane'],
      ['Last week', 'Citizen Connect', 'Pothole reported, not fixed'],
    ],
    fix: { dept: 'BBMP Roads', action: 'Patch 3 potholes on 400 m stretch', window: 'Within 72 hours' },
  },
  {
    id: 'hal', name: 'Old Airport Rd – HAL', x: 362, y: 210, len: 1.2, ff: 2.5, am: 6, pm: 8, delay: 1310,
    causes: { mid: 49, sig: 27, geo: 16, inc: 8 }, main: 'mid',
    finding: 'On-street parking outside a commercial strip narrows the road at evening peak.',
    scene: ['parked', 'parked', 'parked', 'signal'],
    reports: [
      ['19:20', 'Mappls app', 'Double parking outside shops'],
      ['Yesterday', 'Mappls app', 'One lane lost to parking'],
      ['Last week', 'Citizen Connect', 'No enforcement after 6 pm'],
    ],
    fix: { dept: 'Traffic Police (BTP)', action: 'No-parking enforcement; tow-away notice', window: 'Daily 6–10 pm' },
  },
]

export const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6 am .. 10 pm
// Assumption shown in the footer: a completed fix removes ~55% of the delay component it targets.
export const FIX_EFFECT = 0.55

const gauss = (h, mu, s) => Math.exp(-((h - mu) ** 2) / (2 * s * s))
export const before = (hs, h) => hs.ff + (hs.am - hs.ff) * gauss(h, 9, 1.3) + (hs.pm - hs.ff) * gauss(h, 18.5, 1.6)
export const after = (hs, h) => hs.ff + (before(hs, h) - hs.ff) * (1 - (FIX_EFFECT * hs.causes[hs.main]) / 100)
export const peakHour = hs => HOURS.reduce((a, h) => (before(hs, h) > before(hs, a) ? h : a), HOURS[0])

export const severity = d =>
  d >= 3000 ? { key: 'critical', label: 'Critical' } : d >= 1800 ? { key: 'serious', label: 'High' } : { key: 'warning', label: 'Moderate' }
export const fmt = n => n.toLocaleString('en-IN')
export const hourLabel = h => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`

// ---- Schematic map geometry (viewBox 0 0 620 440) ----
export const ROADS = [
  { d: 'M 250 62 C 330 60 420 90 470 148 C 490 185 470 220 452 250 C 440 290 430 320 412 334 C 370 362 310 366 262 362 C 190 360 120 330 92 262 C 70 190 120 90 250 62', major: true }, // ORR
  { d: 'M 236 0 L 250 62 L 215 185', major: true }, // Bellary Rd
  { d: 'M 205 190 C 300 175 400 160 470 148 L 620 112', major: true }, // Old Madras Rd
  { d: 'M 205 195 L 362 210 L 452 250', major: true }, // Old Airport Rd
  { d: 'M 452 250 C 500 230 530 205 562 192 L 620 185', major: true }, // Whitefield Rd
  { d: 'M 200 200 L 232 296 L 262 362 L 330 440', major: true }, // Hosur Rd
  { d: 'M 232 296 C 300 315 360 328 412 334 L 520 440', major: false }, // Sarjapur Rd
  { d: 'M 210 192 C 250 240 260 260 232 296', major: false },
  { d: 'M 362 210 L 370 290', major: false },
  { d: 'M 0 210 L 205 192', major: false },
  { d: 'M 92 262 L 0 300', major: false },
]
export const MAP_LABELS = [
  [198, 180, 'MG Road'], [470, 112, 'KR Puram'], [570, 220, 'Whitefield'], [302, 52, 'Hebbal'],
  [512, 270, 'Marathahalli'], [336, 202, 'HAL'], [466, 356, 'Bellandur'], [262, 396, 'Silk Board'],
  [160, 300, 'Koramangala'], [114, 120, 'Outer Ring Rd'],
]
export const INCIDENT = { x: 440, y: 293 }
export const ROUTE_ORIG = 'M 452 250 C 440 290 430 320 412 334 C 370 362 310 366 262 362'
export const ROUTE_ALT = 'M 452 250 L 362 210 L 370 290 C 330 300 280 300 232 296 L 262 362'

export const TIMELINE = [
  ['T+0:00', 'Slowdown detected', 'Probe speed on ORR at Kadubeesanahalli fell to 7 km/h vs 31 km/h typical'],
  ['T+1:40', 'Confirmed by app users', '4 Mappls app reports of waterlogging, 2 with photos'],
  ['T+2:30', 'Ticket raised', 'BBMP storm-water desk + BTP control room · #RP-2041'],
  ['T+2:45', 'Drivers alerted', '2,300 approaching navigation sessions offered a reroute'],
]

export const DEMO_STEPS = ['Open worst hotspot', 'Not a signal problem', 'Raise ticket', 'Measure the fix', 'Live incident']
