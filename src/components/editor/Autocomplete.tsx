'use client'
import { useEffect, useRef } from 'react'

interface AutocompleteProps {
  suggestions: string[]
  query: string
  position: { top: number; left: number }
  onSelect: (value: string) => void
  onDismiss: () => void
}

export function Autocomplete({ suggestions, query, position, onSelect, onDismiss }: AutocompleteProps) {
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = suggestions.filter(s =>
    s.toLowerCase().startsWith(query.toLowerCase()) && s.toLowerCase() !== query.toLowerCase()
  ).slice(0, 8)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onDismiss() }
    }
    document.addEventListener('keydown', handleKey, true)
    return () => document.removeEventListener('keydown', handleKey, true)
  }, [onDismiss])

  if (filtered.length === 0) return null

  return (
    <div
      ref={listRef}
      style={{
        position: 'fixed', top: position.top, left: position.left,
        background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 6,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 1000,
        minWidth: 220, overflow: 'hidden',
      }}
    >
      {filtered.map((s, i) => (
        <div
          key={s}
          onClick={() => onSelect(s)}
          style={{
            padding: '0.4rem 0.75rem',
            fontFamily: '"Courier Prime", monospace', fontSize: '11pt',
            color: '#e8e6de', cursor: 'pointer',
            borderBottom: i < filtered.length - 1 ? '1px solid #2a2a30' : 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#2a2a30')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ color: '#e8b86d' }}>{s.slice(0, query.length)}</span>
          {s.slice(query.length)}
        </div>
      ))}
    </div>
  )
}
