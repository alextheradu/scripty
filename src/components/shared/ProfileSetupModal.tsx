'use client'
import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface ProfileSetupModalProps {
  onComplete: () => void
}

export function ProfileSetupModal({ onComplete }: ProfileSetupModalProps) {
  const { data: session, update } = useSession()
  const [displayName, setDisplayName] = useState(session?.user?.name ?? '')
  const [previewUrl, setPreviewUrl] = useState<string | null>(session?.user?.image ?? null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [useInitials, setUseInitials] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const effectiveName = displayName.trim() || (session?.user?.name ?? '')
  const effectiveImage = useInitials ? null : previewUrl

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setUseInitials(false)
    const reader = new FileReader()
    reader.onload = ev => setPreviewUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!displayName.trim()) {
      setError('Please enter a display name.')
      return
    }
    setSaving(true)
    setError('')

    try {
      // 1. Upload image if one was selected
      if (pendingFile) {
        const form = new FormData()
        form.append('file', pendingFile)
        const uploadRes = await fetch('/api/user/avatar', { method: 'POST', body: form })
        if (!uploadRes.ok) {
          const d = await uploadRes.json()
          setError(d.error ?? 'Image upload failed.')
          setSaving(false)
          return
        }
        const d = await uploadRes.json()
        setPreviewUrl(d.url)
        setPendingFile(null)
        // profileImage already saved by /api/user/avatar — just save displayName
        const nameRes = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: displayName.trim() }),
        })
        if (!nameRes.ok) {
          const nd = await nameRes.json()
          setError(nd.error ?? 'Failed to save.')
          setSaving(false)
          return
        }
      } else {
        // No file — save displayName + profileImage together.
        // If user hasn't removed their photo, preserve previewUrl (may be the Google
        // OAuth image loaded on mount). If they clicked ×, useInitials=true → clear it.
        const res = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: displayName.trim(),
            profileImage: useInitials ? null : (previewUrl ?? null),
          }),
        })
        if (!res.ok) {
          const d = await res.json()
          setError(d.error ?? 'Failed to save.')
          setSaving(false)
          return
        }
      }

      await update()
      setSaving(false)
      onComplete()
    } catch {
      setError('An unexpected error occurred.')
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,15,17,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 12,
        padding: '2rem', width: '100%', maxWidth: 420,
        fontFamily: 'Syne, sans-serif',
      }}>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.5rem', color: '#e8b86d', marginTop: 0, marginBottom: '0.25rem' }}>
          Set up your profile
        </h2>
        <p style={{ color: '#6b6a64', fontSize: '0.875rem', marginTop: 0, marginBottom: '1.5rem' }}>
          This is how other collaborators will see you.
        </p>

        {/* Avatar picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <AvatarPreview name={effectiveName} src={effectiveImage} size={56} />
            {!useInitials && previewUrl && (
              <button
                onClick={() => { setUseInitials(true); setPendingFile(null); setPreviewUrl(null) }}
                title="Remove photo"
                style={{
                  position: 'absolute', top: -4, right: -4, width: 20, height: 20,
                  borderRadius: '50%', background: '#2a2a30', border: '1px solid #3a3a40',
                  color: '#6b6a64', cursor: 'pointer', fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                }}
              >×</button>
            )}
          </div>
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'none', border: '1px solid #2a2a30', borderRadius: 6,
                padding: '0.3rem 0.75rem', color: '#e8e6de',
                fontFamily: 'Syne, sans-serif', fontSize: '0.8125rem', cursor: 'pointer',
                display: 'block', marginBottom: '0.375rem',
              }}
            >
              {previewUrl && !useInitials ? 'Change photo' : 'Upload photo'}
            </button>
            {useInitials && (
              <span style={{ fontSize: '0.75rem', color: '#6b6a64' }}>Using initials</span>
            )}
            {pendingFile && (
              <span style={{ fontSize: '0.75rem', color: '#6b6a64', display: 'block', marginTop: '0.25rem' }}>
                {pendingFile.name}
              </span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {/* Display name */}
        <label style={{ display: 'block', color: '#6b6a64', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
          Display name
        </label>
        <input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Your name"
          maxLength={60}
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0f0f11', border: '1px solid #2a2a30', borderRadius: 6,
            padding: '0.5rem 0.75rem', color: '#e8e6de',
            fontFamily: 'Syne, sans-serif', fontSize: '0.9375rem', outline: 'none',
            marginBottom: '1.25rem',
          }}
        />

        {error && (
          <p style={{ color: '#e05e5e', fontSize: '0.8125rem', margin: '0 0 0.75rem' }}>{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', background: '#e8b86d', color: '#0f0f11', border: 'none',
            borderRadius: 6, padding: '0.625rem', fontFamily: 'Syne, sans-serif',
            fontWeight: 600, fontSize: '0.9375rem', cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </div>
  )
}

function AvatarPreview({ name, src, size = 48 }: { name: string; src?: string | null; size?: number }) {
  const initials = (name || '?').split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase()
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#e8b86d',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 600, color: '#0f0f11',
      fontFamily: 'Syne, sans-serif', flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}
