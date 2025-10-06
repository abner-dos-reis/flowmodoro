import React, { useEffect, useState, useRef } from 'react'
import { DEFAULTS } from '../config'

const STORAGE_KEY = 'flowmodoro_sessions_v1'
const SETTINGS_KEY = 'flowmodoro_settings_v1'

function todayIsoDay() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}
function localDayForDate(dt = new Date()) {
  const local = new Date(dt)
  // yyyy-mm-dd in local time
  const year = local.getFullYear()
  const mm = String(local.getMonth() + 1).padStart(2, '0')
  const dd = String(local.getDate()).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function formatTime(seconds) {
  const secs = Math.max(0, Number.isFinite(seconds) ? seconds : 0)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`
}

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  if (s >= 3600) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return `${h}h ${m}m`
  }
  if (s >= 60) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}m ${sec}s`
  }
  return `${s}s`
}

export default function TimerPanel({ onOpenConfig, onOpenTracking }) {
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const secondsRef = useRef(0)
  const [flowCount, setFlowCount] = useState(0)
  const [sessions, setSessions] = useState([])
  const [mode, setMode] = useState('focus') // 'focus' | 'break'
  const [breakMinutes, setBreakMinutes] = useState(DEFAULTS.shortBreakMinutes)
  const [breakSecondsLeft, setBreakSecondsLeft] = useState(0)
  const [breakTitle, setBreakTitle] = useState('Break')
  const [settings, setSettings] = useState(DEFAULTS)
  const timerRef = useRef(null)

  useEffect(() => {
    // Try to load today's sessions from API, fallback to localStorage
    async function loadSessions() {
      const day = localDayForDate()
      try {
        const res = await fetch(`/api/totals/${day}`)
        if (res.ok) {
          const j = await res.json()
          // j.sessions is the raw rows, map to our session shape
          const fromApi = (j.sessions || []).map(s => ({ id: s.id, seconds: s.seconds, kind: s.kind, date: s.date }))
          setSessions(fromApi)
          return
        }
      } catch (e) {
        // ignore and fallback
      }
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        // filter to today's local-day sessions only
        const parsed = JSON.parse(saved)
        const today = localDayForDate()
        const filtered = parsed.filter(s => (s.local_day ? s.local_day === today : s.date.slice(0,10) === today))
        setSessions(filtered)

        // attempt to sync unsynced entries in background
        const unsynced = parsed.filter(x => !x.synced)
        if (unsynced.length) {
          ;(async () => {
            for (const u of unsynced) {
              try {
                const res2 = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) })
                if (res2.ok) {
                  const j2 = await res2.json()
                  u.synced = true
                  u.id = j2.id
                }
              } catch (err) {
                // leave unsynced
              }
            }
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)) } catch (e) {}
          })()
        }
      }
    }
    loadSessions()
    const s2 = localStorage.getItem(SETTINGS_KEY)
    if (s2) {
      const parsed = JSON.parse(s2)
      setSettings(parsed)
      setBreakMinutes(parsed.shortBreakMinutes)
    }
    // listen for settings updates
    function onSettings(e) {
      const parsed = e.detail
      setSettings(parsed)
      setBreakMinutes(parsed.shortBreakMinutes)
    }
    window.addEventListener('flowmodoro:settings', onSettings)
    return () => window.removeEventListener('flowmodoro:settings', onSettings)
  }, [])

  useEffect(() => {
    setFlowCount(sessions.length)
  }, [sessions])

  useEffect(() => {
    secondsRef.current = seconds
  }, [seconds])

  useEffect(() => {
    // single interval driving either focus (count up) or break (count down)
    if (running) {
      timerRef.current = setInterval(() => {
        if (mode === 'focus') {
          setSeconds(s => s + 1)
        } else if (mode === 'break') {
          setBreakSecondsLeft(s => s - 1)
        }
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => clearInterval(timerRef.current)
  }, [running, mode])

  function start() { setRunning(true) }
  function pause() { setRunning(false) }
  // Reset sets the counter to zero but does not stop the running state
  function reset() {
    if (mode === 'focus') setSeconds(0)
    else if (mode === 'break') {
      // reset break to configured minutes
      setBreakSecondsLeft(breakMinutes * 60)
    }
  }

  function recordSession(kind) {
    const recorded = Math.max(0, Math.floor(secondsRef.current || 0))
  const now = new Date()
  const entry = { seconds: recorded, kind, date: now.toISOString(), local_day: localDayForDate(now) }
    // attempt to post to server
    (async () => {
      try {
        const res = await fetch('/api/session', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry)
        })
        if (res.ok) {
          const j = await res.json()
          const savedEntry = { id: j.id, ...entry, synced: true }
          const updated = [...sessions, savedEntry]
          setSessions(updated)
          // append to global history
          try {
            const global = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
            global.push(savedEntry)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(global))
          } catch (e) {}
        } else {
          throw new Error('server')
        }
      } catch (e) {
        // fallback to localStorage and mark unsynced
        const savedEntry = { id: Date.now(), ...entry, synced: false }
        const updated = [...sessions, savedEntry]
        setSessions(updated)
        try {
          const global = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
          global.push(savedEntry)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(global))
        } catch (e) {}
      }
    })()
    setFlowCount(c => c + 1)
    setSeconds(0)
    setRunning(false)
  }

  // record a break session (seconds spent in break)
  function recordBreak(secondsSpent, kindLabel) {
    const now = new Date()
    const entry = { seconds: Math.max(0, Math.floor(secondsSpent)), kind: kindLabel, date: now.toISOString(), local_day: localDayForDate(now) }
    ;(async () => {
      try {
        const res = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
        if (res.ok) {
          const j = await res.json()
          const savedEntry = { id: j.id, ...entry, synced: true }
          const updated = [...sessions, savedEntry]
          setSessions(updated)
          try {
            const global = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
            global.push(savedEntry)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(global))
          } catch (e) {}
        } else throw new Error('server')
      } catch (e) {
        const savedEntry = { id: Date.now(), ...entry, synced: false }
        const updated = [...sessions, savedEntry]
        setSessions(updated)
        try {
          const global = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
          global.push(savedEntry)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(global))
        } catch (e) {}
      }
    })()
  }

  function stopOrSkip(kind) {
    if (mode === 'focus') {
      // end focus session and start break
      recordSession(kind)
      const newFlowCount = flowCount + 1
      const afterLong = (newFlowCount % settings.flowsBeforeLongBreak) === 0
      const minutes = afterLong ? settings.longBreakMinutes : settings.shortBreakMinutes
      setBreakMinutes(minutes)
      setBreakTitle(afterLong ? 'Big Break' : 'Break')
      setBreakSecondsLeft(minutes * 60)
      setMode('break')
      setRunning(true) // start break automatically
    } else if (mode === 'break') {
      // stop or skip the break: record the partial break time then return to focus
      const elapsed = (breakMinutes * 60) - (breakSecondsLeft || 0)
      const label = breakTitle === 'Big Break' ? 'big_break' : 'break'
      recordBreak(elapsed, label)
      setMode('focus')
      setBreakSecondsLeft(0)
      setSeconds(0)
      setRunning(true)
    }
  }

  function onBreakEnd() {
    // break finished naturally -> return to focus
    const elapsed = (breakMinutes * 60)
    const label = breakTitle === 'Big Break' ? 'big_break' : 'break'
    recordBreak(elapsed, label)
    setMode('focus')
    setBreakSecondsLeft(0)
    setSeconds(0)
    setRunning(true)
  }

  // handle break countdown reaching zero
  useEffect(() => {
    if (mode === 'break' && breakSecondsLeft <= 0 && breakSecondsLeft !== null) {
      onBreakEnd()
    }
  }, [breakSecondsLeft, mode])

  return (
    <div className="timer-panel text-center">
      <div className="card-header-top d-flex justify-content-center align-items-center mb-2">
        <div>
          <h2>Flowmodoro</h2>
          <p className="muted">{mode === 'focus' ? 'Focus Session' : breakTitle}</p>
        </div>
      </div>

      <div className="timer-display">
        {mode === 'focus' ? (
          <div className={`time-large`}>{formatTime(seconds)}</div>
        ) : (
          <div className={`time-large`}>{formatTime(breakSecondsLeft)}</div>
        )}
      </div>

      <div className="button-row d-flex gap-2 justify-content-center mt-3">
        {!running ? (
          <button className="btn btn-primary btn-lg" onClick={start}>Start</button>
        ) : (
          <button className="btn btn-warning btn-lg" onClick={pause}>Pause</button>
        )}
        <button className="btn btn-secondary btn-lg" onClick={reset}>Reset</button>
        <button className="btn btn-danger btn-lg" onClick={() => stopOrSkip('stop')}>Stop</button>
        <button className="btn btn-info btn-lg" onClick={() => stopOrSkip('skip')}>Skip</button>
      </div>

      <hr />
      <div className="stats d-flex justify-content-between px-4">
        <div>
          <div className="stat-label">Flowmodoros</div>
          <div className="stat-value">{flowCount}</div>
        </div>
        <div>
          <div className="stat-label">Total Time</div>
          <div className="stat-value">{formatDuration(sessions.reduce((a, b) => a + b.seconds, 0))}</div>
        </div>
      </div>
      <div className="card-actions-bottom d-flex justify-content-center mt-3">
        <button className="btn btn-sm btn-outline-light me-3" onClick={() => onOpenTracking && onOpenTracking()}>Tracking</button>
        <button className="btn btn-sm btn-outline-light" onClick={() => onOpenConfig && onOpenConfig()}>Settings</button>
      </div>
      {/* no modal: break is handled inline inside the card */}
    </div>
  )
}
