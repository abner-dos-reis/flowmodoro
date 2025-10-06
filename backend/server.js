const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()

const DB_PATH = process.env.DB_PATH || '/data/flowmodoro.sqlite'

const db = new sqlite3.Database(DB_PATH)

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seconds INTEGER NOT NULL,
    kind TEXT NOT NULL,
    date TEXT NOT NULL,
    local_day TEXT
  )`)
  // ensure local_day column exists on older installs
  db.all("PRAGMA table_info('sessions')", (err, cols) => {
    if (!err) {
      const names = cols.map(c => c.name)
      if (!names.includes('local_day')) {
        db.run('ALTER TABLE sessions ADD COLUMN local_day TEXT')
      }
    }
  })
})

const app = express()
app.use(cors())
app.use(bodyParser.json())

app.get('/api/ping', (req, res) => res.json({ ok: true }))

// record a session
app.post('/api/session', (req, res) => {
  const { seconds, kind, date, local_day } = req.body || {}
  if (typeof seconds !== 'number' || !kind || !date) return res.status(400).json({ error: 'invalid' })
  const stmt = db.prepare('INSERT INTO sessions (seconds, kind, date, local_day) VALUES (?, ?, ?, ?)')
  stmt.run(seconds, kind, date, local_day || null, function (err) {
    if (err) return res.status(500).json({ error: err.message })
    res.json({ id: this.lastID })
  })
})

// get totals for a given day (YYYY-MM-DD)
app.get('/api/totals/:day', (req, res) => {
  // day is expected as YYYY-MM-DD representing local day on client
  const day = req.params.day
  db.all('SELECT * FROM sessions WHERE local_day = ? OR substr(date,1,10) = ?', [day, day], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message })
    // aggregate per kind
    const byKind = rows.reduce((acc, r) => {
      const k = r.kind || 'flow'
      acc[k] = acc[k] || { totalSeconds: 0, sessions: [] }
      acc[k].totalSeconds += r.seconds || 0
      acc[k].sessions.push(r)
      return acc
    }, {})
    res.json({ day, totals: byKind, sessions: rows })
  })
})

const port = process.env.PORT || 3001
app.listen(port, () => console.log('Flowmodoro API listening on', port))
