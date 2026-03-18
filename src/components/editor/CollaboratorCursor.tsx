import { useState } from 'react'

interface CursorProps {
  name: string
  color: string
  top: number
  left: number
}

export function CollaboratorCursor({ name, color, top, left }: CursorProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{ position: 'absolute', top, left, pointerEvents: 'auto', zIndex: 20 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: 'absolute', top: -4, left: -6, width: 14, height: 28 }} />
      <div style={{ width: 2, height: 20, background: color, borderRadius: 1 }} />
      <div style={{
        position: 'absolute', top: -20, left: 0,
        background: color, color: '#0f0f11',
        fontSize: '0.625rem', fontFamily: 'Syne, sans-serif',
        padding: '1px 4px', borderRadius: '3px 3px 3px 0',
        whiteSpace: 'nowrap', fontWeight: 600,
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateY(0)' : 'translateY(2px)',
        transition: 'opacity 120ms ease, transform 120ms ease',
      }}>
        {name}
      </div>
    </div>
  )
}
