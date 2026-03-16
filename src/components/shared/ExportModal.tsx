'use client'

interface ExportModalProps {
  scriptId: string
  scriptTitle: string
  open: boolean
  onClose: () => void
}

const FORMATS = [
  { id: 'pdf',      label: 'PDF',         desc: 'Proper screenplay format with Courier Prime, margins, title page' },
  { id: 'fountain', label: 'Fountain',    desc: 'Fountain plain-text format (.fountain)' },
  { id: 'fdx',      label: 'Final Draft', desc: 'Final Draft 12 XML (.fdx)' },
  { id: 'txt',      label: 'Plain Text',  desc: 'Readable text with screenplay spacing (.txt)' },
]

export function ExportModal({ scriptId, scriptTitle, open, onClose }: ExportModalProps) {
  if (!open) return null

  function download(format: string) {
    window.open(`/api/scripts/${scriptId}/export?format=${format}`, '_blank')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 10, padding: '1.5rem', width: 420, maxWidth: '90vw' }}>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.25rem', marginBottom: '1.25rem', color: '#e8e6de' }}>
          Export &ldquo;{scriptTitle}&rdquo;
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {FORMATS.map(f => (
            <button
              key={f.id}
              onClick={() => download(f.id)}
              style={{
                background: '#0f0f11', border: '1px solid #2a2a30', borderRadius: 8,
                padding: '0.75rem 1rem', textAlign: 'left', cursor: 'pointer',
                transition: 'border-color 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#e8b86d')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a30')}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e8e6de', fontFamily: 'Syne, sans-serif', marginBottom: '0.2rem' }}>{f.label}</div>
              <div style={{ fontSize: '0.6875rem', color: '#6b6a64', fontFamily: 'Syne, sans-serif' }}>{f.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #2a2a30', borderRadius: 6, padding: '0.4rem 0.875rem', color: '#e8e6de', fontFamily: 'Syne, sans-serif', fontSize: '0.8125rem', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
