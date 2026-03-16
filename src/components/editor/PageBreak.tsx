interface PageBreakProps { pageNumber: number }

export function PageBreak({ pageNumber }: PageBreakProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      margin: '0.5rem 0', userSelect: 'none', pointerEvents: 'none',
    }}>
      <div style={{ flex: 1, borderTop: '1px dashed #2a2a30' }} />
      <span style={{ fontSize: '0.6875rem', color: '#6b6a64', fontFamily: 'Syne, sans-serif', letterSpacing: '0.05em' }}>
        {pageNumber}
      </span>
      <div style={{ flex: 1, borderTop: '1px dashed #2a2a30' }} />
    </div>
  )
}
