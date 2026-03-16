interface CursorProps {
  name: string
  color: string
  top: number
  left: number
}

export function CollaboratorCursor({ name, color, top, left }: CursorProps) {
  return (
    <div style={{ position: 'absolute', top, left, pointerEvents: 'none', zIndex: 20 }}>
      <div style={{ width: 2, height: 20, background: color, borderRadius: 1 }} />
      <div style={{
        position: 'absolute', top: -20, left: 0,
        background: color, color: '#0f0f11',
        fontSize: '0.625rem', fontFamily: 'Syne, sans-serif',
        padding: '1px 4px', borderRadius: '3px 3px 3px 0',
        whiteSpace: 'nowrap', fontWeight: 600,
      }}>
        {name}
      </div>
    </div>
  )
}
