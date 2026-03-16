'use client'
import { useState } from 'react'

interface ShareModalProps {
  scriptId: string
  shareToken: string | null
  open: boolean
  onClose: () => void
  isAdmin: boolean
}

export function ShareModal({ scriptId, shareToken: initial, open, onClose, isAdmin }: ShareModalProps) {
  const [shareToken, setShareToken] = useState(initial)
  const [copying, setCopying] = useState(false)

  if (!open) return null

  async function togglePublic(enable: boolean) {
    const res = await fetch(`/api/scripts/${scriptId}/share`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable }),
    })
    const d = await res.json()
    setShareToken(d.shareToken ?? null)
  }

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : null

  async function copyLink() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopying(true)
    setTimeout(() => setCopying(false), 1500)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 10, padding: '1.5rem', width: 420, maxWidth: '90vw' }}>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.25rem', marginBottom: '1.25rem', color: '#e8e6de' }}>
          Share Script
        </h2>

        {/* Public read-only toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0.75rem', background: '#0f0f11', borderRadius: 8 }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#e8e6de', fontFamily: 'Syne, sans-serif', marginBottom: '0.2rem' }}>Public read-only link</div>
            <div style={{ fontSize: '0.6875rem', color: '#6b6a64', fontFamily: 'Syne, sans-serif' }}>Anyone with the link can view</div>
          </div>
          <button
            onClick={() => togglePublic(!shareToken)}
            disabled={!isAdmin}
            style={{
              width: 40, height: 22, borderRadius: 11, border: 'none', cursor: isAdmin ? 'pointer' : 'not-allowed',
              background: shareToken ? '#e8b86d' : '#2a2a30',
              position: 'relative', transition: 'background 200ms',
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: shareToken ? 21 : 3,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'left 200ms',
            }} />
          </button>
        </div>

        {shareUrl && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              value={shareUrl} readOnly
              style={{ flex: 1, background: '#0f0f11', border: '1px solid #2a2a30', borderRadius: 6, padding: '0.4rem 0.6rem', color: '#6b6a64', fontFamily: 'Syne, sans-serif', fontSize: '0.75rem', outline: 'none' }}
            />
            <button onClick={copyLink} style={{ background: '#e8b86d', border: 'none', borderRadius: 6, padding: '0.4rem 0.75rem', color: '#0f0f11', fontFamily: 'Syne, sans-serif', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {copying ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #2a2a30', borderRadius: 6, padding: '0.4rem 0.875rem', color: '#e8e6de', fontFamily: 'Syne, sans-serif', fontSize: '0.8125rem', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
