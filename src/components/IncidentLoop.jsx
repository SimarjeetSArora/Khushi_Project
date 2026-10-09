import { TIMELINE } from '../data'
import { Button, Card, SimTag } from './ui'

function PhoneMap({ incident }) {
  return (
    <svg viewBox="0 0 184 364" className="absolute inset-0 size-full">
      <rect width="184" height="364" fill="#e9eef3" />
      <ellipse cx="70" cy="230" rx="34" ry="16" fill="#cfe1f3" />
      {[['M -10 120 L 200 100', 5], ['M 40 0 L 60 364', 4], ['M 0 300 L 200 260', 4], ['M 130 0 C 120 120 150 220 110 364', 7]].map(([d, w]) => (
        <path key={d} d={d} stroke="#fff" strokeWidth={w} fill="none" />
      ))}
      <path d="M 128 70 C 122 160 150 220 110 340" stroke={incident === 2 ? '#9aa4ae' : '#2a78d6'} strokeWidth="5" fill="none" strokeLinecap="round" />
      {incident === 2 && (
        <path d="M 128 70 L 58 110 L 50 210 L 110 340" stroke="#2a78d6" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {incident > 0 && (
        <g>
          <circle cx="138" cy="200" r="9" fill="#d03b3b" stroke="#fff" strokeWidth="2" />
          <text x="138" y="204" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">!</text>
        </g>
      )}
      <circle cx="128" cy="70" r="6" fill="#fff" stroke="#2a78d6" strokeWidth="3" />
    </svg>
  )
}

function Phone({ incident, alertOpen, onReroute, onIgnore }) {
  const eta = incident === 2 ? 'ETA 24 min · saves 6 min' : incident ? 'ETA 36 min (+6)' : 'ETA 30 min'
  const via = incident === 2 ? 'via Koramangala (rerouted)' : 'Marathahalli → Silk Board via ORR'
  return (
    <div className="relative h-[380px] w-[190px] flex-none overflow-hidden rounded-[30px] border-8 border-[#111] bg-[#e9eef3]" aria-label="Mappls app mock-up">
      <div className="absolute left-1/2 top-0 z-30 h-4 w-[70px] -translate-x-1/2 rounded-b-[10px] bg-[#111]" />
      <PhoneMap incident={incident} />
      <div className="absolute inset-x-2 top-[22px] z-20 rounded-[10px] bg-[#0d366b] px-2.5 py-2 text-[11px] text-white">
        <b className="block text-[13px]">{eta}</b>
        {via}
      </div>
      <SimTag className="absolute left-1/2 top-[90px] z-20 -translate-x-1/2 text-[9px]" />
      <div
        role="alert"
        className={`absolute inset-x-2 bottom-2.5 z-20 rounded-[14px] bg-white p-2.5 text-xs text-[#0b0b0b] shadow-[0_6px_20px_rgba(0,0,0,.25)] transition-transform duration-300 motion-reduce:transition-none ${alertOpen ? 'translate-y-0' : 'translate-y-[130%]'}`}
      >
        <div className="text-[13px] font-bold">🌧 Waterlogging ahead</div>
        <div className="mb-2 mt-1 text-[#52514e]">ORR near Kadubeesanahalli · <b>+6 min delay</b>. Reroute via Koramangala?</div>
        <div className="flex gap-1.5">
          <button onClick={onIgnore} className="flex-1 cursor-pointer rounded-lg border border-[#ccc] bg-white p-1.5 text-xs font-semibold">Ignore</button>
          <button onClick={onReroute} className="flex-1 cursor-pointer rounded-lg border border-[#2a78d6] bg-[#2a78d6] p-1.5 text-xs font-semibold text-white">Reroute</button>
        </div>
      </div>
    </div>
  )
}

export default function IncidentLoop({ incident, step, alertOpen, onTrigger, onReroute, onIgnore }) {
  return (
    <Card title="Incident response loop" hint="Detect an abnormal slowdown, confirm it with app reports, raise a ticket, reroute drivers">
      <div className="grid justify-items-center gap-4 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-start sm:justify-items-stretch">
        <Phone incident={incident} alertOpen={alertOpen} onReroute={onReroute} onIgnore={onIgnore} />
        <div className="w-full">
          <ol className="grid">
            {TIMELINE.map(([t, title, text], i) => {
              const on = i < step
              return (
                <li key={t} className={`grid grid-cols-[14px_1fr] gap-2 pb-3 transition-opacity duration-300 ${on ? 'opacity-100' : 'opacity-30'}`}>
                  <span className={`mt-1 size-2.5 rounded-full border-2 ${on ? 'border-accent bg-accent' : 'border-muted bg-surface'}`} />
                  <span>
                    <b className="block text-[13px]">
                      <span className="mr-1.5 text-[11px] font-semibold tabular-nums text-muted">{t}</span>
                      {title}
                    </b>
                    <span className="text-xs text-ink-2">{text}</span>
                  </span>
                </li>
              )
            })}
          </ol>
          <Button variant="danger" onClick={onTrigger} disabled={incident > 0}>⚡ Trigger incident</Button>
        </div>
      </div>
    </Card>
  )
}
