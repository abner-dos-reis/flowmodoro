import React, { useEffect, useState } from 'react'
import { DEFAULTS } from '../config'

const SETTINGS_KEY = 'flowmodoro_settings_v1'

export default function ConfigModal({ show, onHide }) {
  const [shortBreak, setShortBreak] = useState(DEFAULTS.shortBreakMinutes)
  const [longBreak, setLongBreak] = useState(DEFAULTS.longBreakMinutes)
  const [flowsBeforeLong, setFlowsBeforeLong] = useState(DEFAULTS.flowsBeforeLongBreak)

  useEffect(() => {
    const s = localStorage.getItem(SETTINGS_KEY)
    if (s) {
      const parsed = JSON.parse(s)
      setShortBreak(parsed.shortBreakMinutes)
      setLongBreak(parsed.longBreakMinutes)
      setFlowsBeforeLong(parsed.flowsBeforeLongBreak)
    }
  }, [show])

  function save() {
    const obj = { shortBreakMinutes: Number(shortBreak), longBreakMinutes: Number(longBreak), flowsBeforeLongBreak: Number(flowsBeforeLong) }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj))
    // dispatch a custom event so other parts of the app can react without reload
    try { window.dispatchEvent(new CustomEvent('flowmodoro:settings', { detail: obj })) } catch (e) {}
    onHide()
  }

  if (!show) return null
  return (
    <div className="config-modal-overlay" onClick={onHide}>
      <div className="config-modal frosted p-4" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="mb-0">Settings</h5>
            <small className="text-muted">Customize break durations and rhythm</small>
          </div>
          <button className="close-btn text-light" onClick={onHide} aria-label="Close">✕</button>
        </div>

        <div className="mb-3 form-row">
          <label className="form-label">Short Break (minutes)</label>
          <input type="number" min="1" step="1" className="form-control input-soft" value={shortBreak} onChange={e => setShortBreak(e.target.value)} />
        </div>
        <div className="mb-3 form-row">
          <label className="form-label">Long Break (minutes)</label>
          <input type="number" min="1" step="1" className="form-control input-soft" value={longBreak} onChange={e => setLongBreak(e.target.value)} />
        </div>
        <div className="mb-3 form-row">
          <label className="form-label">Flows before long break</label>
          <input type="number" min="1" step="1" className="form-control input-soft" value={flowsBeforeLong} onChange={e => setFlowsBeforeLong(e.target.value)} />
        </div>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <button className="btn btn-outline-light btn-cancel" onClick={onHide}>Cancel</button>
          <button className="btn btn-primary btn-save" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}
