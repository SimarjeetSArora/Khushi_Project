// FlowGuard corridor engine — a seeded, second-by-second queue simulation of a 3-junction corridor
// (A → B → C → downstream signal D) run under three controllers with identical arrivals.
// All numbers it produces are SIMULATED and uncalibrated.

export const SEED = 1000

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const JUNCTIONS = ['A', 'B', 'C']
export const P = {
  headway: 2, // s per vehicle at saturation
  allRed: 3, // s lost at every phase change
  freeFlow: [25, 25, 20], // s travel time on links A→B, B→C, C→D
  storage: [20, 20, 12], // vehicles each link can hold (incl. queue at its downstream stop line)
  exitCycle: 90, // downstream signal D (not controlled by us)
  minMain: 10, maxMain: 60, minSide: 7, maxSide: 30,
}
const FREE_FLOW_AC = P.freeFlow[0] + P.freeFlow[1]

export const CONTROLLERS = [
  { key: 'fixed', label: 'Fixed timer' },
  { key: 'adaptive', label: 'Local adaptive' },
  { key: 'flowguard', label: 'FlowGuard' },
]

// main / side = arrival rates (veh/h); exitGreen = seconds of green per 90 s cycle at downstream signal D
export const SCENARIOS = {
  normal: { label: 'Normal traffic', main: 820, side: 300, exitGreen: 56 },
  surge: { label: 'Evening surge', main: 990, side: 340, exitGreen: 56 },
  blocked: { label: 'Downstream nearly blocked', main: 735, side: 300, exitGreen: 40 },
  closure: { label: 'Closure diversion', main: 975, side: 320, exitGreen: 54 },
}

// Common random numbers: every lane reads the same uniforms for second t, so the
// three controllers always face exactly the same cars.
export function createArrivalStream(seed = SEED) {
  const rng = mulberry32(seed)
  const u = []
  return t => {
    while (u.length <= t) u.push([rng(), rng(), rng(), rng()])
    return u[t]
  }
}

export function createSim(controller) {
  return {
    controller,
    t: 0,
    mainQ: [[], [], []],
    sideQ: [[], [], []],
    link: [[], [], []],
    exitQ: [],
    sig: JUNCTIONS.map(() => ({ phase: 'main', since: 0, target: null })),
    lastDis: [-99, -99, -99],
    lastExit: -99,
    blocked: [false, false, false],
    full: [false, false, false],
    freeSince: [0, 0, 0],
    m: freshMetrics(),
  }
}

function freshMetrics() {
  return {
    wait: 0, served: 0, trips: 0, tripSum: 0, maxQ: 0, spill: 0, wasted: 0, sideMax: 0,
    naiveErr: 0, qaErr: 0, etaN: 0, lastTrip: null, recent: [], start: null,
  }
}
export const resetMetrics = sim => { sim.m = { ...freshMetrics(), lastTrip: sim.m.lastTrip, recent: sim.m.recent, start: sim.t } }

// "Last-trip estimate": what a probe-based ETA knows — the average of A→C trips finished in the last 5 minutes.
function lastTripEstimate(m, t) {
  while (m.recent.length && m.recent[0][0] < t - 300) m.recent.shift()
  if (!m.recent.length) return m.lastTrip ?? FREE_FLOW_AC
  return m.recent.reduce((a, r) => a + r[1], 0) / m.recent.length
}

export const occupancy = (sim, j) => sim.link[j].length + (j < 2 ? sim.mainQ[j + 1].length : sim.exitQ.length)

// ---------- Controllers: return the phase this junction wants now ----------
function wantFixed(sim, j) {
  const cycle = 86
  const offset = j * 22 // simple green wave
  return (sim.t + cycle - offset) % cycle < 50 ? 'main' : 'side'
}

function wantAdaptive(sim, j) {
  const g = sim.sig[j]
  const el = sim.t - g.since
  if (g.phase === 'main') {
    if (el < P.minMain || sim.sideQ[j].length === 0) return 'main'
    if (sim.mainQ[j].length === 0 || el >= P.maxMain) return 'side'
    return 'main'
  }
  if (el < P.minSide) return 'side'
  if (sim.sideQ[j].length === 0 || el >= P.maxSide) return 'main'
  return 'side'
}

// FlowGuard = the same local logic, plus it knows how full the road ahead is:
// it never holds main green into a full link, and uses that time for the side street.
function wantFlowGuard(sim, j) {
  const g = sim.sig[j]
  const el = sim.t - g.since
  const full = occupancy(sim, j) >= P.storage[j] - 1
  if (g.phase === 'main') {
    if (el < P.minMain) return 'main'
    if (full) return 'side'
    return wantAdaptive(sim, j)
  }
  if (el < P.minSide) return 'side'
  if (full && el < P.maxSide + 30) return 'side'
  return wantAdaptive(sim, j)
}

const WANT = { fixed: wantFixed, adaptive: wantAdaptive, flowguard: wantFlowGuard }

// Queue-aware ETA (A→C) for a vehicle joining A now: play the current queues, signals and
// downstream space forward on a copy of the corridor, with no knowledge of future arrivals.
const NO_ARRIVALS = () => [1, 1, 1, 1]
function forecastAC(sim, v) {
  const c = {
    ...sim,
    mainQ: sim.mainQ.map(q => q.slice()),
    sideQ: sim.sideQ.map(q => q.slice()),
    link: sim.link.map(q => q.slice()),
    exitQ: sim.exitQ.slice(),
    sig: sim.sig.map(g => ({ ...g })),
    lastDis: sim.lastDis.slice(),
    blocked: sim.blocked.slice(),
    full: sim.full.slice(),
    freeSince: sim.freeSince.slice(),
    m: { ...sim.m, recent: [] },
    forecasting: true,
  }
  c.mainQ[0].push(v)
  for (let i = 0; i < 1800; i++) {
    step(c, NO_ARRIVALS, { main: 0, side: 0, exitGreen: c.exitGreen })
    const l2 = c.link[2]
    if (l2.length && l2[l2.length - 1].v === v) return c.t - 1 - sim.t
  }
  return 1800
}

export function step(sim, stream, cfg) {
  const t = sim.t
  const [uM, u0, u1, u2] = stream(t)
  const m = sim.m

  sim.exitGreen = cfg.exitGreen

  // 1. arrivals (each main-road car gets two A→C forecasts: last-trip estimate and queue-aware)
  if (uM < cfg.main / 3600) {
    const v = { t0: t, naive: sim.forecasting ? 0 : lastTripEstimate(m, t), qa: 0 }
    if (!sim.forecasting) v.qa = forecastAC(sim, v)
    sim.mainQ[0].push(v)
  }
  ;[u0, u1, u2].forEach((u, j) => { if (u < cfg.side / 3600) sim.sideQ[j].push({ t0: t }) })

  // 2. vehicles finishing a link join the next stop line
  for (let j = 0; j < 3; j++) {
    while (sim.link[j].length && sim.link[j][0].at <= t) {
      const { v } = sim.link[j].shift()
      if (j < 2) sim.mainQ[j + 1].push(v)
      else sim.exitQ.push(v)
    }
  }

  // 3. downstream signal D (outside our control)
  if (t % P.exitCycle < cfg.exitGreen && sim.exitQ.length && t - sim.lastExit >= P.headway) {
    sim.exitQ.shift()
    sim.lastExit = t
  }

  // 4. signal decisions (with all-red between phases)
  const want = WANT[sim.controller]
  for (let j = 0; j < 3; j++) {
    const g = sim.sig[j]
    if (g.phase === 'allred') {
      if (t - g.since >= P.allRed) { g.phase = g.target; g.since = t }
      continue
    }
    const w = want(sim, j)
    if (w !== g.phase) { g.phase = 'allred'; g.target = w; g.since = t }
  }

  // 5. discharge
  for (let j = 0; j < 3; j++) {
    const g = sim.sig[j]
    sim.blocked[j] = false
    if (g.phase === 'main' && sim.mainQ[j].length) {
      if (occupancy(sim, j) >= P.storage[j]) {
        sim.blocked[j] = true
        m.wasted++
      } else if (t - sim.lastDis[j] >= P.headway) {
        const v = sim.mainQ[j].shift()
        sim.link[j].push({ v, at: t + P.freeFlow[j] })
        sim.lastDis[j] = t
        if (j === 2) {
          const trip = t - v.t0
          m.trips++
          m.tripSum += trip
          m.lastTrip = trip
          if (!sim.forecasting) m.recent.push([t, trip])
          m.naiveErr += Math.abs(v.naive - trip)
          m.qaErr += Math.abs(v.qa - trip)
          m.etaN++
        }
      }
    } else if (g.phase === 'side' && sim.sideQ[j].length && t - sim.lastDis[j] >= P.headway) {
      const v = sim.sideQ[j].shift()
      sim.lastDis[j] = t
      m.served++
      m.sideMax = Math.max(m.sideMax, t - v.t0)
    }
  }

  // 6. bookkeeping
  for (let j = 0; j < 3; j++) {
    m.wait += sim.mainQ[j].length + sim.sideQ[j].length
    m.maxQ = Math.max(m.maxQ, sim.mainQ[j].length)
    if (sim.sideQ[j].length) m.sideMax = Math.max(m.sideMax, t - sim.sideQ[j][0].t0)
    // Spillback episode: a link fills up after having had free space for at least 20 s.
    const full = occupancy(sim, j) >= P.storage[j]
    if (full && !sim.full[j] && sim.freeSince[j] !== null && t - sim.freeSince[j] >= 20) m.spill++
    if (full) sim.freeSince[j] = null
    else if (sim.freeSince[j] === null) sim.freeSince[j] = t
    sim.full[j] = full
  }
  if (m.start === null) m.start = t
  sim.t++
}

export function summarize(sim) {
  const m = sim.m
  const hours = Math.max(1, sim.t - (m.start ?? 0)) / 3600
  const vehicles = m.trips + m.served
  return {
    delay: vehicles ? m.wait / vehicles : 0, // avg s of waiting per vehicle
    vehHours: m.wait / 3600, // total vehicle-hours of waiting
    tripAC: m.trips ? m.tripSum / m.trips : 0,
    maxQ: m.maxQ,
    spill: m.spill,
    wastedPerHour: m.wasted / hours,
    vpm: (m.trips + m.served) / (hours * 60),
    sideMax: m.sideMax,
    etaNaive: m.etaN ? m.naiveErr / m.etaN : 0,
    etaQA: m.etaN ? m.qaErr / m.etaN : 0,
    hours,
  }
}

// Headless run used by the experiment script and the Pilot Impact dashboard.
export function runScenario(cfg, controller, seed = SEED, { warmup = 900, horizon = 3600 } = {}) {
  const stream = createArrivalStream(seed)
  const sim = createSim(controller)
  for (let i = 0; i < warmup; i++) step(sim, stream, cfg)
  resetMetrics(sim)
  for (let i = 0; i < horizon; i++) step(sim, stream, cfg)
  return summarize(sim)
}
