'use client'
import { useState, useEffect, useRef } from 'react'
import type { ScriptLine } from '@/lib/editor/types'

interface CharacterPanelProps {
  lines: ScriptLine[]
  scriptId: string
  onInsertCharacter: (name: string) => void
}

export function CharacterPanel({ lines, scriptId, onInsertCharacter }: CharacterPanelProps) {
  const [dbNotes, setDbNotes] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [newChar, setNewChar] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/characters/${scriptId}`)
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = {}
        for (const c of d.characters ?? []) map[c.name] = c.notes ?? ''
        setDbNotes(map)
      })
  }, [scriptId])

  const charMap = lines.reduce<Record<string, number>>((acc, l) => {
    if (l.type === 'CHARACTER' && l.text.trim()) {
      const name = l.text.toUpperCase()
      acc[name] = (acc[name] ?? 0) + 1
    }
    return acc
  }, {})

  const characters = Object.entries(charMap).sort(([, a], [, b]) => b - a)

  function addChar() {
    const name = newChar.trim().toUpperCase()
    if (!name) return
    onInsertCharacter(name)
    setNewChar('')
  }

  return (
    <div style={{ padding: '0.5rem 0' }}>
      <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem' }}>
        <input
          value={newChar}
          onChange={e => setNewChar(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addChar()}
          placeholder="Add character…"
          style={{
            flex: 1, background: '#0f0f11', border: '1px solid #2a2a30', borderRadius: 4,
            padding: '0.25rem 0.5rem', color: '#e8e6de',
            fontFamily: 'Syne, sans-serif', fontSize: '0.75rem', outline: 'none',
          }}
        />
      </div>
      {characters.map(([name, count]) => (
        <div key={name}>
          <div
            onClick={() => setExpanded(expanded === name ? null : name)}
            style={{ padding: '0.4rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2a2a30')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: '0.75rem', color: '#e8e6de', fontFamily: '"Courier Prime", monospace', fontWeight: 700 }}>{name}</span>
            <span style={{ fontSize: '0.625rem', color: '#6b6a64' }}>{count}</span>
          </div>
          {expanded === name && (
            <div style={{ padding: '0.25rem 1rem 0.5rem' }}>
              <textarea
                value={dbNotes[name] ?? ''}
                onChange={e => {
                  const note = e.target.value
                  setDbNotes(prev => ({ ...prev, [name]: note }))
                  if (saveTimer.current) clearTimeout(saveTimer.current)
                  saveTimer.current = setTimeout(() => {
                    fetch(`/api/characters/${scriptId}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name, notes: note }),
                    })
                  }, 800)
                }}
                placeholder="Notes, arc, description…"
                rows={3}
                style={{
                  width: '100%', background: '#0f0f11', border: '1px solid #2a2a30',
                  borderRadius: 4, padding: '0.4rem', color: '#e8e6de',
                  fontFamily: 'Syne, sans-serif', fontSize: '0.75rem', resize: 'vertical', outline: 'none',
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
