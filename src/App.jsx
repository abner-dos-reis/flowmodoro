import React, { useState } from 'react'
import TimerPanel from './components/TimerPanel'
import ConfigModal from './components/ConfigModal'
import CalendarView from './components/CalendarView'

export default function App() {
  const [showConfig, setShowConfig] = useState(false)
  const [view, setView] = useState('main') // 'main' | 'calendar'

  return (
    <div className="app-root vh-100 bg-gradient d-flex flex-column align-items-center justify-content-center">
      {view === 'main' && (
        <div className="card p-4 flow-card">
          <TimerPanel onOpenConfig={() => setShowConfig(true)} onOpenTracking={() => setView('calendar')} />
        </div>
      )}

      {view === 'calendar' && (
        <div className="calendar-page w-100 h-100 d-flex align-items-center justify-content-center">
          <CalendarView onClose={() => setView('main')} />
        </div>
      )}

      <ConfigModal show={showConfig} onHide={() => setShowConfig(false)} />
    </div>
  )
}
