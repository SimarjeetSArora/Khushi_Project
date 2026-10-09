import { CAUSES, CAUSE_TEXT, HOTSPOTS, fmt } from '../data'
import StreetScene from './StreetScene'
import { tipHandlers, useTooltip } from './Tooltip'
import { Button, Card, Pill, SubHeading } from './ui'

export default function HotspotDetail({ hs, ticket, onSelect, onCreateTicket, className = '' }) {
  const tooltip = useTooltip()

  if (!hs) {
    return (
      <Card title="Hotspot detail" right={null} hint="Select a hotspot on the map or in the list." className={className}>
        <Button variant="primary" onClick={() => onSelect(HOTSPOTS[0].id)}>Open worst hotspot</Button>
      </Card>
    )
  }

  const rank = HOTSPOTS.indexOf(hs) + 1
  const share = hs.causes[hs.main]
  const headline =
    hs.main === 'sig'
      ? `${share}% of delay is at the signal → route to Signal Advisor`
      : `${share}% of delay is ${CAUSE_TEXT[hs.main]}, not at the signal`
  const kpis = [
    [fmt(hs.delay), 'veh-hrs lost / day'],
    [`${((hs.len / hs.pm) * 60).toFixed(0)} km/h`, 'evening peak speed'],
    [`${((hs.len / hs.ff) * 60).toFixed(0)} km/h`, 'free-flow speed'],
  ]

  return (
    <Card title={`#${rank} · Hotspot detail`} className={className}>
      <div className="mt-1 text-[17px] font-bold">{hs.name}</div>

      <div className="mb-3.5 mt-2.5 grid grid-cols-3 gap-2">
        {kpis.map(([v, l]) => (
          <div key={l} className="rounded-lg bg-surface-2 px-2.5 py-2">
            <b className="block text-lg">{v}</b>
            <span className="text-[11px] text-ink-2">{l}</span>
          </div>
        ))}
      </div>

      <p className="mb-2 text-[15px] font-semibold">{headline}</p>
      <div className="mb-2 flex h-[22px] gap-0.5" role="img" aria-label="Delay by cause">
        {CAUSES.map(c => (
          <div
            key={c.key}
            className="h-full first:rounded-l last:rounded-r"
            style={{ width: `${hs.causes[c.key]}%`, background: c.color }}
            {...tipHandlers(tooltip, (
              <>
                <b>{c.label}</b><br />
                {hs.causes[c.key]}% · {fmt(Math.round((hs.delay * hs.causes[c.key]) / 100))} veh-hrs/day
              </>
            ))}
          />
        ))}
      </div>
      <div className="mb-3.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink-2">
        {CAUSES.map(c => (
          <div key={c.key} className="flex items-center gap-1.5">
            <i className="size-2.5 flex-none rounded-[3px]" style={{ background: c.color }} />
            {c.label}
            <b className="ml-auto tabular-nums text-ink">{hs.causes[c.key]}%</b>
          </div>
        ))}
      </div>

      <div className="text-[13px]"><b>Finding:</b> {hs.finding}</div>

      <SubHeading>Street view</SubHeading>
      <StreetScene scene={hs.scene} />

      <SubHeading>Recent citizen reports</SubHeading>
      <ul className="grid gap-1.5">
        {hs.reports.map(([when, src, text]) => (
          <li key={text} className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-[12.5px]">
            {text}
            <div className="text-[11px] text-muted">{src} · {when}</div>
          </li>
        ))}
      </ul>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        {!ticket && <Button variant="primary" onClick={() => onCreateTicket(hs)}>Create fix ticket</Button>}
        {ticket?.status === 'open' && <Pill tone="open">Ticket #{ticket.no} open</Pill>}
        {ticket?.status === 'fixed' && <Pill tone="fixed">Fixed ✓ · measured</Pill>}
        <span className="text-[11px] text-muted">Suggested: {hs.fix.dept}</span>
      </div>
    </Card>
  )
}
