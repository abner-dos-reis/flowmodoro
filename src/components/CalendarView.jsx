import React, { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

const STORAGE_KEY = 'flowmodoro_sessions_v1'

function localDayForDate(dt = new Date()) {
  const local = new Date(dt)
  const year = local.getFullYear()
  const mm = String(local.getMonth() + 1).padStart(2, '0')
  const dd = String(local.getDate()).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export default function CalendarView({ onClose }) {
  const [date, setDate] = useState(new Date())
  const [totals, setTotals] = useState({})
  const [rawSessions, setRawSessions] = useState([])
  const [pendingCount, setPendingCount] = useState(0)

  async function loadForDay(d) {
    const day = localDayForDate(d)
    try {
      const res = await fetch(`/api/totals/${day}`)
      if (res.ok) {
        const j = await res.json()
        setTotals(j.totals || {})
        setRawSessions(j.sessions || [])
        return
      }
    } catch (e) {
      // fallback
    }
    const s = localStorage.getItem(STORAGE_KEY)
    const parsed = s ? JSON.parse(s) : []
    const filtered = parsed.filter(x => (x.local_day ? x.local_day === day : x.date.slice(0,10) === day))
    // aggregate
    const byKind = filtered.reduce((acc, r) => {
      const k = r.kind || 'flow'
      acc[k] = acc[k] || { totalSeconds: 0, sessions: [] }
      acc[k].totalSeconds += r.seconds || 0
      acc[k].sessions.push(r)
      return acc
    }, {})
    setTotals(byKind)
    setRawSessions(filtered)
  }

  useEffect(() => { loadForDay(date) }, [date])

  useEffect(() => {
    // count unsynced in global localStorage
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      const uns = (all || []).filter(x => !x.synced)
      setPendingCount(uns.length)
    } catch (e) { setPendingCount(0) }
  }, [date])

  function humanTime(s) {
    const secs = Math.max(0, Math.floor(s || 0))
    if (secs >= 3600) return Math.floor(secs/3600) + 'h ' + Math.floor((secs%3600)/60) + 'm'
    if (secs >= 60) return Math.floor(secs/60) + 'm ' + (secs%60) + 's'
    return secs + 's'
  }

  return (
    <div className="calendar-full p-4 tracking-container container">
      <div className="tracking-title text-center mb-4">
        <h2 className="tracking-h2">Tracking</h2>
        <button className="btn btn-secondary mt-2" onClick={onClose}>Back</button>
      </div>

      <div className="tracking-top d-flex justify-content-center mb-3 fade-in">
        <div className="calendar-frosted" style={{maxWidth:420}}>
          <Calendar onChange={setDate} value={date} />
        </div>
      </div>

      <div className="tracking-columns row justify-content-center">
        {['flow','break','big_break'].map(kind => {
          const k = totals[kind] || { totalSeconds: 0, sessions: [] }
          const title = kind === 'flow' ? 'Flows' : (kind === 'break' ? 'Breaks' : 'Big Breaks')
          const icon = kind === 'flow' ? '⚡' : (kind === 'break' ? '☕' : '🌙')
          return (
            <div key={kind} className={`tracking-column ${kind === 'flow' ? 'col-flow' : (kind === 'break' ? 'col-break' : 'col-big_break')} col-12 col-md-3`}> 
              <div className="col-header"><span className="col-icon">{icon}</span>{title}</div>
              <div className="col-total">Total: {humanTime(k.totalSeconds)}</div>
              <ul className="col-list">
                {(k.sessions || []).map(s => (
                  <li key={s.id}>{new Date(s.date).toLocaleTimeString()} — {Math.floor((s.seconds||0)/60)}m</li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
