'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

type Phase = 'focus' | 'short' | 'long'

interface PomodoroTimerProps {
  open: boolean
  onClose: () => void
  onBroadcast?: (message: string) => void
}

const PHASE_LABELS: Record<Phase, string> = { focus: 'Focus', short: 'Short Break', long: 'Long Break' }

// Generate a 440hz beep using Web Audio API
function playChime() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 440
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
    osc.onended = () => ctx.close()
  } catch {
    // AudioContext blocked — ignore
  }
}

export function PomodoroTimer({ open, onClose, onBroadcast }: PomodoroTimerProps) {
  const [config, setConfig] = useState({ focus: 25, short: 5, long: 15 })
  const [editing, setEditing] = useState(false)
  const [phase, setPhase] = useState<Phase>('focus')
  const [pomodoroCount, setPomodoroCount] = useState(0)
  const [remaining, setRemaining] = useState(config.focus * 60)
  const [running, setRunning] = useState(false)
  const [pos, setPos] = useState({ x: 80, y: 80 })
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const intervalRef = useRef<NodeJS.Timeout>()

  const totalSeconds = config[phase] * 60
  const progress = 1 - remaining / totalSeconds

  const advancePhase = useCallback(() => {
    playChime()
    setRunning(false)
    if (phase === 'focus') {
      const newCount = pomodoroCount + 1
      setPomodoroCount(newCount)
      const nextPhase: Phase = newCount % 4 === 0 ? 'long' : 'short'
      setPhase(nextPhase)
      setRemaining(config[nextPhase] * 60)
      onBroadcast?.(`${PHASE_LABELS.focus} session complete! Starting ${PHASE_LABELS[nextPhase]}.`)
    } else {
      setPhase('focus')
      setRemaining(config.focus * 60)
    }
  }, [phase, pomodoroCount, config, onBroadcast])

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { advancePhase(); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, advancePhase])

  function reset() { setRunning(false); setRemaining(config[phase] * 60) }
  function skip() { advancePhase() }

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0')
  const secs = String(remaining % 60).padStart(2, '0')

  // SVG progress ring
  const R = 48
  const circ = 2 * Math.PI * R
  const dash = circ * (1 - progress)

  function startDrag(e: React.MouseEvent) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
  }
  function onMouseMove(e: MouseEvent) {
    if (!dragRef.current) return
    setPos({
      x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
    })
  }
  function endDrag() { dragRef.current = null }
  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', endDrag)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', endDrag) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y,
      background: '#1a1a1f', border: '1px solid #2a2a30',
      borderRadius: 12, padding: '1rem', width: 200,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 200, userSelect: 'none',
    }}>
      {/* Drag handle */}
      <div
        onMouseDown={startDrag}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', cursor: 'grab' }}
      >
        <span style={{ fontSize: '0.75rem', color: '#6b6a64', fontFamily: 'Syne, sans-serif' }}>
          {PHASE_LABELS[phase]}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b6a64', cursor: 'pointer', fontSize: '1rem', padding: 0 }}>×</button>
      </div>

      {/* Ring + timer */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={60} cy={60} r={R} fill="none" stroke="#2a2a30" strokeWidth={6} />
          <circle
            cx={60} cy={60} r={R} fill="none"
            stroke={phase === 'focus' ? '#e8b86d' : '#52e0b8'}
            strokeWidth={6} strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dash}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
          <text x={60} y={64} textAnchor="middle" style={{ transform: 'rotate(90deg) translate(0,-120px)', fill: '#e8e6de', fontSize: 22, fontFamily: '"Courier Prime", monospace', fontWeight: 700 }}>
            {mins}:{secs}
          </text>
        </svg>

        <div style={{ fontSize: '0.6875rem', color: '#6b6a64', fontFamily: 'Syne, sans-serif' }}>
          Pomodoro {pomodoroCount % 4 + 1} of 4
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setRunning(r => !r)} style={timerBtn('#e8b86d')}>
            {running ? 'Pause' : 'Start'}
          </button>
          <button onClick={reset} style={timerBtn('#2a2a30')}>Reset</button>
          <button onClick={skip} style={timerBtn('#2a2a30')}>Skip</button>
        </div>
      </div>

      {/* Config */}
      {editing ? (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {(['focus', 'short', 'long'] as const).map(p => (
            <label key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: '#6b6a64', fontFamily: 'Syne, sans-serif' }}>
              {PHASE_LABELS[p]}
              <input
                type="number" min={1} max={120}
                value={config[p]}
                onChange={e => {
                  const v = parseInt(e.target.value) || 1
                  setConfig(c => ({ ...c, [p]: v }))
                  if (phase === p) setRemaining(v * 60)
                }}
                style={{ width: 48, background: '#0f0f11', border: '1px solid #2a2a30', borderRadius: 3, padding: '2px 4px', color: '#e8e6de', fontFamily: 'Syne, sans-serif', fontSize: '0.6875rem', textAlign: 'right', outline: 'none' }}
              />
            </label>
          ))}
          <button onClick={() => setEditing(false)} style={{ ...timerBtn('#e8b86d'), marginTop: '0.25rem', width: '100%' }}>Done</button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} style={{ marginTop: '0.75rem', background: 'none', border: 'none', color: '#6b6a64', cursor: 'pointer', fontSize: '0.6875rem', fontFamily: 'Syne, sans-serif', width: '100%' }}>
          Configure…
        </button>
      )}
    </div>
  )
}

function timerBtn(bg: string): React.CSSProperties {
  return {
    background: bg, border: 'none', borderRadius: 4, padding: '0.25rem 0.5rem',
    color: bg === '#e8b86d' ? '#0f0f11' : '#e8e6de',
    fontFamily: 'Syne, sans-serif', fontSize: '0.6875rem',
    cursor: 'pointer', fontWeight: 600,
  }
}
