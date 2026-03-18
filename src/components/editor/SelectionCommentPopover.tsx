'use client'

interface SelectionCommentPopoverProps {
  open: boolean
  top: number
  left: number
  value: string
  submitting: boolean
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export function SelectionCommentPopover({
  open,
  top,
  left,
  value,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: SelectionCommentPopoverProps) {
  if (!open) return null

  return (
    <div style={{
      position: 'absolute',
      top,
      left,
      zIndex: 40,
      width: 280,
      background: '#17171c',
      border: '1px solid #2a2a30',
      borderRadius: 12,
      boxShadow: '0 18px 40px rgba(0,0,0,0.24)',
      padding: '0.85rem',
    }}>
      <div style={{ color: '#e8e6de', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.55rem' }}>
        Add comment
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Leave a comment on this selection…"
        style={{
          width: '100%',
          minHeight: 88,
          resize: 'vertical',
          background: '#0f0f11',
          border: '1px solid #2a2a30',
          borderRadius: 10,
          color: '#e8e6de',
          padding: '0.7rem 0.8rem',
          fontSize: '0.78rem',
          outline: 'none',
          fontFamily: 'Syne, sans-serif',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem', marginTop: '0.7rem' }}>
        <button onClick={onCancel} style={secondaryBtnStyle}>Cancel</button>
        <button onClick={onSubmit} disabled={submitting || !value.trim()} style={primaryBtnStyle}>
          {submitting ? 'Saving…' : 'Comment'}
        </button>
      </div>
    </div>
  )
}

const secondaryBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #2a2a30',
  borderRadius: 999,
  padding: '0.38rem 0.72rem',
  color: '#e8e6de',
  fontSize: '0.72rem',
  cursor: 'pointer',
}

const primaryBtnStyle: React.CSSProperties = {
  background: '#e8b86d',
  border: 'none',
  borderRadius: 999,
  padding: '0.42rem 0.8rem',
  color: '#0f0f11',
  fontSize: '0.72rem',
  cursor: 'pointer',
  fontWeight: 700,
}
