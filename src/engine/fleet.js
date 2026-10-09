// Fleet delivery-risk logic. Orders are invented SAMPLE DATA; route penalties are ASSUMED.
import { bypassTrip, divertedTrip, residentDelay } from './closure.js'
import { clockLabel } from './events.js'

const at = hhmm => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m - 10 * 60 // minutes after the 10:00 demo start
}

// route: 'expressway' (closed by the Missing Link event), 'corridor' (the NH-48 corridor itself),
// 'kolkata-zone' (inside the Puja closure / goods-ban zone), 'other'
export const ORDERS = [
  { id: 'PN-2101', from: 'Bhiwandi DC', to: 'Hinjewadi Ph 2, Pune', city: 'Pune', vehicle: 'LCV', route: 'expressway', eta: at('11:20'), win: [at('11:00'), at('12:05')], departed: true },
  { id: 'PN-2102', from: 'Navi Mumbai DC', to: 'Chakan MIDC, Pune', city: 'Pune', vehicle: 'HCV', route: 'expressway', eta: at('11:40'), win: [at('11:30'), at('12:30')], departed: true },
  { id: 'PN-2103', from: 'Thane DC', to: 'Kharadi, Pune', city: 'Pune', vehicle: 'LCV', route: 'expressway', eta: at('12:10'), win: [at('11:00'), at('12:58')], departed: false },
  { id: 'PN-2104', from: 'Wakad hub', to: 'Baner, Pune', city: 'Pune', vehicle: 'LCV', route: 'other', eta: at('10:40'), win: [at('10:30'), at('11:30')], departed: true },
  { id: 'PN-2105', from: 'Hinjewadi hub', to: 'Lonavala market', city: 'Pune', vehicle: 'LCV', route: 'corridor', eta: at('11:05'), win: [at('11:00'), at('11:45')], departed: true },
  { id: 'PN-2106', from: 'Pune DC', to: 'Satara Rd, Pune', city: 'Pune', vehicle: 'HCV', route: 'other', eta: at('11:15'), win: [at('11:00'), at('12:00')], departed: true },
  { id: 'KO-3101', from: 'Howrah DC', to: 'Gariahat, Kolkata', city: 'Kolkata', vehicle: 'HCV', route: 'kolkata-zone', eta: at('11:30'), win: [at('11:00'), at('12:15')], departed: false },
  { id: 'KO-3102', from: 'Dankuni DC', to: 'Salt Lake Sector V', city: 'Kolkata', vehicle: 'LCV', route: 'other', eta: at('11:10'), win: [at('11:00'), at('12:00')], departed: true },
  { id: 'KO-3103', from: 'Howrah DC', to: 'Park Street, Kolkata', city: 'Kolkata', vehicle: 'LCV', route: 'kolkata-zone', eta: at('11:00'), win: [at('10:45'), at('11:35')], departed: true },
  { id: 'KO-3104', from: 'Kolkata DC', to: 'New Town', city: 'Kolkata', vehicle: 'LCV', route: 'other', eta: at('11:45'), win: [at('11:30'), at('12:30')], departed: false },
]

export const RISK = {
  ok: { key: 'ok', label: 'On time', icon: '✓', color: 'var(--color-good)' },
  risk: { key: 'risk', label: 'At risk', icon: '!', color: 'var(--color-warning)' },
  miss: { key: 'miss', label: 'Will miss', icon: '✕', color: 'var(--color-critical)' },
}
export const riskOf = slack => (slack >= 15 ? RISK.ok : slack >= 0 ? RISK.risk : RISK.miss)

// Route options (ETA in demo minutes) for an order under the loaded event and split.
export function routeOptions(order, ev, s, live) {
  const base = order.eta
  if (!live || !ev) return [{ id: 'original', label: 'Original route', eta: base }]
  if (ev.id === 'missing-link' && order.route === 'expressway') {
    return [
      { id: 'original', label: 'Original (expressway)', eta: null, note: 'Closed' },
      { id: 'corridor', label: 'Via NH-48 corridor', eta: base + 20 + (divertedTrip(s) - 14) * 3 + (corridorTripExtra(s)) },
      { id: 'bypass', label: 'Via ghat bypass', eta: base + 20 + (bypassTrip(s) - 22) * 3 },
    ]
  }
  if (ev.id === 'missing-link' && order.route === 'corridor') {
    return [{ id: 'original', label: 'NH-48 corridor (now carrying diverted traffic)', eta: base + (residentDelay(s) - 18) / 6 }]
  }
  if (ev.id === 'puja' && order.route === 'kolkata-zone') {
    const banned = order.vehicle === 'HCV'
    return [
      { id: 'original', label: 'Original (pandal zone)', eta: null, note: 'Closed' },
      { id: 'corridor', label: 'Parallel arterial', eta: banned ? null : base + 12 + (divertedTrip(s) - 14) * 2, note: banned ? 'Goods-vehicle ban' : undefined },
      { id: 'bypass', label: 'Ring-road bypass', eta: banned ? null : base + 22 + (bypassTrip(s) - 22) * 2, note: banned ? 'Goods-vehicle ban' : undefined },
    ]
  }
  return [{ id: 'original', label: 'Original route', eta: base }]
}
const corridorTripExtra = s => 8 * s // corridor is shorter but slower when loaded

// The route navigation would currently give the driver (first open one), and the best action.
export function assess(order, ev, s, live) {
  const routes = routeOptions(order, ev, s, live)
  const open = routes.filter(r => r.eta !== null)
  const current = open[0] ?? null
  const end = order.win[1]
  const eta = current ? current.eta : null
  const risk = eta === null ? RISK.miss : riskOf(end - eta)

  let action = null
  if (risk.key !== 'ok') {
    const best = open.reduce((a, r) => (!a || r.eta < a.eta ? r : a), null)
    if (best && best !== current && end - best.eta >= 0) {
      action = { label: `Take ${best.label.replace(/^Via /, '')}`, saved: eta - best.eta, eta: best.eta }
    } else if (!open.length && order.vehicle === 'HCV') {
      const lcv = order.eta + 18
      action = end - lcv >= 0
        ? { label: 'Swap to an LCV (outside goods ban)', saved: null, eta: lcv }
        : { label: 'Move slot +2 h (customer notified)', saved: null, eta: null }
    } else if (!order.departed && ev && ev.kind === 'Unplanned') {
      const later = order.eta + 30 + Math.max(0, (eta - order.eta) * 0.35)
      action = end - later >= 0
        ? { label: 'Leave 30 min later', saved: null, eta: later }
        : { label: 'Move slot +1 h (customer notified)', saved: null, eta: null }
    } else {
      action = { label: 'Move slot +1 h (customer notified)', saved: null, eta: null }
    }
  }
  return { routes, current, eta, risk, action, slack: eta === null ? null : end - eta }
}

export const fmtClock = clockLabel

// 7-day restriction calendar (sample data, written from public notices).
export const CALENDAR = [
  { day: 'Sat 10 Oct', items: [{ text: 'Missing Link closure replay (demo event)', city: 'Pune', tag: 'Closure', when: 'missing-link' }] },
  { day: 'Sun 11 Oct', items: [] },
  { day: 'Mon 12 Oct', items: [] },
  { day: 'Tue 13 Oct', items: [{ text: 'Goods-vehicle ban in Puja pandal zones begins', city: 'Kolkata', tag: 'Goods ban' }] },
  { day: 'Wed 14 Oct', items: [{ text: 'Goods-vehicle ban in pandal zones', city: 'Kolkata', tag: 'Goods ban' }, { text: 'Event day: heavy vehicles banned 4 am–8 pm (example)', city: 'Pune', tag: 'HCV ban' }] },
  { day: 'Thu 15 Oct', items: [{ text: 'Goods-vehicle ban in pandal zones', city: 'Kolkata', tag: 'Goods ban' }] },
  { day: 'Fri 16 Oct', items: [{ text: 'Goods-vehicle ban in pandal zones', city: 'Kolkata', tag: 'Goods ban' }] },
]
