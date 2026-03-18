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
  const [exportingFormat, setExportingFormat] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(scriptTitle)
    setWrittenBy(defaultWrittenBy)
    setDate(getTodayValue())
    setError('')
    setExportingFormat(null)
  }, [defaultWrittenBy, open, scriptTitle])

  if (!open) return null

  async function download(format: string) {
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

    setExportingFormat(format)
    setError('')

    try {
      const response = await fetch(`/api/scripts/${scriptId}/export?${params.toString()}`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error ?? 'Export failed.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = getDownloadFilename(response.headers.get('content-disposition'), title.trim(), format)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setExportingFormat(null)
    }
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
              onClick={() => void download(f.id)}
              disabled={!!exportingFormat}
              style={{
                background: '#0f0f11', border: '1px solid #2a2a30', borderRadius: 8,
                padding: '0.75rem 1rem', textAlign: 'left', cursor: 'pointer',
                transition: 'border-color 150ms',
                opacity: exportingFormat && exportingFormat !== f.id ? 0.55 : 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#e8b86d')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a30')}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e8e6de', fontFamily: 'Syne, sans-serif', marginBottom: '0.2rem' }}>
                {exportingFormat === f.id ? 'Preparing…' : f.label}
              </div>
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

function getDownloadFilename(contentDisposition: string | null, title: string, format: string) {
  const utf8Match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])

  const basicMatch = contentDisposition?.match(/filename="([^"]+)"/i)
  if (basicMatch?.[1]) return basicMatch[1]

  const extension = format === 'txt' ? 'txt' : format
  return `${title.replace(/["\r\n]/g, '_')}.${extension}`
}
