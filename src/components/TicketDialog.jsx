import { useEffect, useRef, useState } from 'react'
import { CAUSE_TEXT, DEPARTMENTS } from '../data'
import { Button } from './ui'

const FIELD = 'w-full rounded-lg border border-axis bg-page px-2.5 py-1.5 text-sm text-ink'
const LABEL = 'mb-1 mt-3 block text-xs font-semibold text-ink-2'

export default function TicketDialog({ hs, onClose, onSubmit }) {
  const ref = useRef(null)
  // Remounted per hotspot (keyed in App), so the form starts from that hotspot's suggested fix.
  const [form, setForm] = useState(() => (hs ? { ...hs.fix } : null))

  useEffect(() => {
    if (hs) ref.current?.showModal()
  }, [hs])

  const close = () => {
    ref.current?.close()
    onClose()
  }
  const submit = e => {
    e.preventDefault()
    ref.current?.close()
    onSubmit(hs.id, form)
  }
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <dialog
      ref={ref}
      onCancel={e => { e.preventDefault(); close() }}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-xl border border-black/10 bg-surface p-5 text-ink"
    >
      {hs && form && (
        <form onSubmit={submit}>
          <h3 className="text-base font-bold">Create fix ticket</h3>
          <div className="text-[11px] text-muted">{hs.name}</div>

          <label className={LABEL} htmlFor="fDept">Assign to department</label>
          <select id="fDept" className={FIELD} value={form.dept} onChange={set('dept')}>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>

          <label className={LABEL} htmlFor="fAction">Action</label>
          <input id="fAction" className={FIELD} value={form.action} onChange={set('action')} required />

          <label className={LABEL} htmlFor="fWindow">Time window</label>
          <input id="fWindow" className={FIELD} value={form.window} onChange={set('window')} required />

          <label className={LABEL} htmlFor="fEvidence">Evidence attached</label>
          <textarea
            id="fEvidence"
            rows={2}
            readOnly
            className={FIELD}
            value={`Probe-speed delay profile; cause split (${hs.causes[hs.main]}% ${CAUSE_TEXT[hs.main]}); street imagery; ${hs.reports.length} citizen reports`}
          />

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" onClick={close}>Cancel</Button>
            <Button type="submit" variant="primary">Send ticket</Button>
          </div>
        </form>
      )}
    </dialog>
  )
}
