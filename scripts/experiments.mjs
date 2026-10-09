// 20-seed experiment: every scenario × controller, seeds 1000–1019. Writes src/engine/results.json,
// which the Pilot Impact dashboard reads. Run with: npm run experiments
import { writeFileSync } from 'node:fs'
import { CONTROLLERS, SCENARIOS, SEED, runScenario } from '../src/engine/corridor.js'

const SEEDS = Array.from({ length: 20 }, (_, i) => SEED + i)
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d

const out = { seeds: [SEEDS[0], SEEDS.at(-1)], generated: new Date().toISOString().slice(0, 10), scenarios: {} }
for (const [key, cfg] of Object.entries(SCENARIOS)) {
  const per = {}
  for (const c of CONTROLLERS) {
    const runs = SEEDS.map(s => runScenario(cfg, c.key, s))
    per[c.key] = Object.fromEntries(['delay', 'vehHours', 'tripAC', 'spill', 'wastedPerHour', 'sideMax', 'etaNaive', 'etaQA'].map(k => [k, round(mean(runs.map(r => r[k])))]))
  }
  out.scenarios[key] = { label: cfg.label, ...per, savedVehHours: round(per.adaptive.vehHours - per.flowguard.vehHours) }
  console.log(key, 'saved', out.scenarios[key].savedVehHours, 'waste', per.adaptive.wastedPerHour, '→', per.flowguard.wastedPerHour, 'eta', per.adaptive.etaNaive, '→', per.adaptive.etaQA)
}
writeFileSync(new URL('../src/engine/results.json', import.meta.url), JSON.stringify(out, null, 2) + '\n')
