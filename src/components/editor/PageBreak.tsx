interface PageBreakProps {
  pageNumber: number
  top: string
}

export function PageBreak({ pageNumber, top }: PageBreakProps) {
  return (
    <div style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top,
      transform: 'translateY(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      userSelect: 'none',
      pointerEvents: 'none',
      zIndex: 4,
    }}>
      <div style={{ flex: 1, borderTop: '1px dashed #2a2a30' }} />
      <span style={{ fontSize: '0.6875rem', color: '#6b6a64', fontFamily: 'Syne, sans-serif', letterSpacing: '0.05em', background: '#fffef7', padding: '0 0.35rem' }}>
        {pageNumber}
      </span>
      <div style={{ flex: 1, borderTop: '1px dashed #2a2a30' }} />
    </div>
  )
}
