import React, { useEffect, useRef, useState } from 'react'

export default function BreakModal({ minutes, onEnd, onClose }) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60)
  const [running, setRunning] = useState(true)
  const timerRef = useRef(null)

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setSecondsLeft(s => s - 1), 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => clearInterval(timerRef.current)
  }, [running])

  useEffect(() => {
    if (secondsLeft <= 0) {
      setRunning(false)
      onEnd()
    }
  }, [secondsLeft])

  useEffect(() => {
    // play a short beep when break starts
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 880
      o.connect(g)
      g.connect(ctx.destination)
      o.start()
      g.gain.setValueAtTime(0.2, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15)
      o.stop(ctx.currentTime + 0.2)
    } catch (e) {
      // ignore audio errors
    }
  }, [])

  function formatTime(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')} : ${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="config-modal-overlay">
      <div className="config-modal card p-3 text-center">
        <h5>Break</h5>
        <div className="time-large">{formatTime(secondsLeft)}</div>
        <div className="d-flex justify-content-center gap-2">
          {running ? (
            <button className="btn btn-warning" onClick={() => setRunning(false)}>Pause</button>
          ) : (
            <button className="btn btn-success" onClick={() => setRunning(true)}>Resume</button>
          )}
          <button className="btn btn-secondary" onClick={() => { setSecondsLeft(minutes * 60); setRunning(false); }}>Reset</button>
          <button className="btn btn-danger" onClick={() => { onEnd(); onClose && onClose(); }}>Stop</button>
          <button className="btn btn-info" onClick={() => { onEnd(); onClose && onClose(); }}>Skip</button>
        </div>
      </div>
    </div>
  )
}
