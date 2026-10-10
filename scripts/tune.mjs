// Quick look at engine outputs for seed 1000 (used while tuning parameters).
import { CONTROLLERS, SCENARIOS, runScenario } from '../src/engine/corridor.js'

for (const [k, cfg] of Object.entries(SCENARIOS)) {
  const r = Object.fromEntries(CONTROLLERS.map(c => [c.key, runScenario(cfg, c.key)]))
  const f = x => x.toFixed(1)
  console.log(`\n${k}: saved vh=${f(r.adaptive.vehHours - r.roadsync.vehHours)}`)
  for (const c of CONTROLLERS) {
    const s = r[c.key]
    console.log(`  ${c.key.padEnd(9)} delay ${f(s.delay)}s  vh ${f(s.vehHours)}  AC ${f(s.tripAC)}  maxQ ${s.maxQ}  spill ${s.spill}  wasted/h ${f(s.wastedPerHour)}  vpm ${f(s.vpm)}  side ${s.sideMax}  eta ${f(s.etaNaive)}/${f(s.etaQA)}`)
  }
}
