'use client'
import { useEffect, useState } from 'react'

interface ExportModalProps {
  scriptId: string
  scriptTitle: string
  defaultWrittenBy: string
  open: boolean
  onClose: () => void
}

const FORMATS = [
  { id: 'pdf',      label: 'PDF',         desc: 'Proper screenplay format with Courier Prime, margins, title page' },
  { id: 'fountain', label: 'Fountain',    desc: 'Fountain plain-text format (.fountain)' },
  { id: 'fdx',      label: 'Final Draft', desc: 'Final Draft 12 XML (.fdx)' },
  { id: 'txt',      label: 'Plain Text',  desc: 'Readable text with screenplay spacing (.txt)' },
]

function getTodayValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = `${today.getMonth() + 1}`.padStart(2, '0')
  const day = `${today.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function ExportModal({ scriptId, scriptTitle, defaultWrittenBy, open, onClose }: ExportModalProps) {
  const [title, setTitle] = useState(scriptTitle)
  const [writtenBy, setWrittenBy] = useState(defaultWrittenBy)
  const [date, setDate] = useState(getTodayValue())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(scriptTitle)
    setWrittenBy(defaultWrittenBy)
    setDate(getTodayValue())
    setError('')
  }, [defaultWrittenBy, open, scriptTitle])

  if (!open) return null

  function download(format: string) {
    if (!title.trim() || !writtenBy.trim() || !date) {
      setError('Enter the title, writer name, and draft date before exporting.')
      return
    }

    const params = new URLSearchParams({
      format,
      title: title.trim(),
      writtenBy: writtenBy.trim(),
      date,
    })

    window.open(`/api/scripts/${scriptId}/export?${params.toString()}`, '_blank')
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 10, padding: '1.5rem', width: 420, maxWidth: '90vw' }}>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.25rem', marginBottom: '1.25rem', color: '#e8e6de' }}>
          Export &ldquo;{scriptTitle}&rdquo;
        </h2>

        <div style={{ display: 'grid', gap: '0.875rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Script title</label>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); setError('') }}
              placeholder="Untitled Script"
              maxLength={120}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Written by</label>
            <input
              value={writtenBy}
              onChange={e => { setWrittenBy(e.target.value); setError('') }}
              placeholder="Writer name"
              maxLength={120}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Draft date</label>
            <input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setError('') }}
              style={inputStyle}
            />
          </div>
        </div>

        {error && (
          <p style={{ margin: '0 0 1rem', color: '#e05e5e', fontFamily: 'Syne, sans-serif', fontSize: '0.8125rem' }}>
            {error}
          </p>
        )}

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

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#6b6a64',
  fontSize: '0.75rem',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  marginBottom: '0.375rem',
  fontFamily: 'Syne, sans-serif',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#0f0f11',
  border: '1px solid #2a2a30',
  borderRadius: 6,
  padding: '0.5rem 0.75rem',
  color: '#e8e6de',
  fontFamily: 'Syne, sans-serif',
  fontSize: '0.9375rem',
  outline: 'none',
}
