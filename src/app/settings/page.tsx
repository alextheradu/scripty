'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/shared/Avatar'
import { AppNav } from '@/components/shared/AppNav'

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? 'admin@example.com').toLowerCase()

type Invite = {
  id: string
  email: string
  createdAt: string
  usedAt: string | null
  invitedBy: { name: string; email: string }
}

type PlatformUser = {
  id: string
  email: string
  name: string | null
  displayName: string | null
  profileImage: string | null
  image: string | null
  createdAt: string
}

export default function Settings() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile state
  const [displayName, setDisplayName] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [useInitials, setUseInitials] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Invite state (admin only)
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Users state (admin only)
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [kickingId, setKickingId] = useState<string | null>(null)

  const isAdmin = session?.user?.email?.toLowerCase() === ADMIN_EMAIL

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      setDisplayName(session.user.displayName ?? session.user.name ?? '')
      const img = session.user.profileImage ?? session.user.image ?? null
      setPreviewUrl(img)
      setUseInitials(!img)
    }
  }, [session])

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/invites').then(r => r.json()).then(d => setInvites(d.invites ?? []))
    fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users ?? []))
  }, [isAdmin])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setUseInitials(false)
    const reader = new FileReader()
    reader.onload = ev => setPreviewUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function saveProfile() {
    if (!displayName.trim()) {
      setProfileMsg({ text: 'Display name is required.', ok: false })
      return
    }
    setProfileSaving(true)
    setProfileMsg(null)

    try {
      // 1. If there's a new file to upload, send it to /api/user/avatar first
      let newImageUrl: string | null = useInitials ? null : (previewUrl && !pendingFile ? previewUrl : null)
      if (pendingFile) {
        const form = new FormData()
        form.append('file', pendingFile)
        const uploadRes = await fetch('/api/user/avatar', { method: 'POST', body: form })
        if (!uploadRes.ok) {
          const d = await uploadRes.json()
          setProfileMsg({ text: d.error ?? 'Image upload failed.', ok: false })
          setProfileSaving(false)
          return
        }
        const d = await uploadRes.json()
        newImageUrl = d.url
        setPendingFile(null)
        setPreviewUrl(newImageUrl)
      }

      // 2. Save displayName (and profileImage if not uploading a file — avatar route already persisted it)
      const patchBody: Record<string, unknown> = { displayName: displayName.trim() }
      if (!pendingFile) {
        patchBody.profileImage = useInitials ? null : newImageUrl
      }
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      })
      const data = await res.json()
      if (!res.ok) {
        setProfileMsg({ text: data.error ?? 'Failed to save.', ok: false })
        setProfileSaving(false)
        return
      }

      await update()
      setProfileMsg({ text: 'Profile saved.', ok: true })
    } finally {
      setProfileSaving(false)
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg(null)
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    })
    const data = await res.json()
    setInviting(false)
    if (!res.ok) {
      setInviteMsg({ text: data.error ?? 'Failed to send invite.', ok: false })
    } else {
      setInviteMsg({ text: `Invite saved for ${inviteEmail.trim()}. They can now sign in with Google.`, ok: true })
      setInviteEmail('')
      setInvites(prev => [data.invite, ...prev])
    }
  }

  async function revokeInvite(email: string) {
    await fetch('/api/invites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setInvites(prev => prev.filter(i => i.email !== email))
  }

  async function kickUser(id: string) {
    if (!confirm('Remove this user from the platform? Their scripts and data will be deleted.')) return
    setKickingId(id)
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    setKickingId(null)
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== id))
      // Also re-open their invite as pending in the invite list
      const kicked = users.find(u => u.id === id)
      if (kicked) {
        setInvites(prev => prev.map(inv =>
          inv.email === kicked.email ? { ...inv, usedAt: null } : inv
        ))
      }
    } else {
      const d = await res.json()
      alert(d.error ?? 'Failed to remove user.')
    }
  }

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#0f0f11', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6a64', fontFamily: 'Syne, sans-serif' }}>
      Loading…
    </div>
  )

  const effectiveName = displayName.trim() || (session?.user?.name ?? '')
  const effectiveImage = useInitials ? null : previewUrl

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f11', color: '#e8e6de' }}>
      <AppNav
        actions={
          <button onClick={() => signOut({ callbackUrl: '/' })} style={ghostBtn}>
            Sign out
          </button>
        }
      />

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '2.5rem 2rem' }}>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: '#e8b86d', marginTop: 0, marginBottom: '2rem' }}>
          Settings
        </h1>

        {/* Profile section */}
        <section style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 10, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 600, color: '#e8e6de', marginTop: 0, marginBottom: '1.25rem' }}>
            Profile
          </h2>

          {/* Avatar picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar src={effectiveImage} name={effectiveName} size={64} />
              {!useInitials && (
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
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, color: '#e8e6de', marginBottom: '0.375rem' }}>{effectiveName || 'Your name'}</div>
              <div style={{ fontSize: '0.8125rem', color: '#6b6a64', marginBottom: '0.625rem' }}>{session?.user?.email}</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ ...ghostBtn, fontSize: '0.8125rem' }}
                >
                  {useInitials ? 'Upload photo' : 'Change photo'}
                </button>
                {useInitials && (
                  <span style={{ fontSize: '0.75rem', color: '#6b6a64', alignSelf: 'center' }}>Using initials</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              {pendingFile && (
                <div style={{ fontSize: '0.75rem', color: '#6b6a64', marginTop: '0.375rem' }}>
                  {pendingFile.name} — will upload on save
                </div>
              )}
            </div>
          </div>

          <label style={labelStyle}>Display name</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            style={{ ...inputStyle, marginBottom: '1.25rem' }}
          />

          {profileMsg && (
            <p style={{ color: profileMsg.ok ? '#52e0b8' : '#e05e5e', fontSize: '0.8125rem', margin: '0 0 0.75rem' }}>
              {profileMsg.text}
            </p>
          )}

          <button onClick={saveProfile} disabled={profileSaving} style={primaryBtn}>
            {profileSaving ? 'Saving…' : 'Save changes'}
          </button>
        </section>

        {/* Users section (admin only) */}
        {isAdmin && (
          <section style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 10, padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 600, color: '#e8e6de', marginTop: 0, marginBottom: '0.375rem' }}>
              Users
            </h2>
            <p style={{ color: '#6b6a64', fontSize: '0.8125rem', margin: '0 0 1.25rem' }}>
              All registered accounts on this platform.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {users.map(u => {
                const isSelf = u.id === session?.user?.id
                const label = u.displayName ?? u.name ?? u.email
                const avatar = u.profileImage ?? u.image
                return (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#0f0f11', borderRadius: 6, padding: '0.5rem 0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                      <Avatar src={avatar} name={label} size={28} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#e8e6de', fontSize: '0.875rem', fontFamily: 'Syne, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {label}
                          {isSelf && <span style={{ marginLeft: '0.4rem', color: '#6b6a64', fontSize: '0.75rem' }}>you</span>}
                        </div>
                        <div style={{ color: '#6b6a64', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                      </div>
                    </div>
                    {!isSelf && (
                      <button
                        onClick={() => kickUser(u.id)}
                        disabled={kickingId === u.id}
                        style={{
                          background: 'none', border: '1px solid #3a1a1a', borderRadius: 4,
                          color: '#e05e5e', cursor: kickingId === u.id ? 'wait' : 'pointer',
                          fontFamily: 'Syne, sans-serif', fontSize: '0.75rem',
                          padding: '0.2rem 0.625rem', flexShrink: 0, marginLeft: '0.75rem',
                          opacity: kickingId === u.id ? 0.5 : 1,
                        }}
                      >
                        {kickingId === u.id ? 'Removing…' : 'Remove'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Invite section (admin only) */}
        {isAdmin && (
          <section style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 10, padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 600, color: '#e8e6de', marginTop: 0, marginBottom: '0.375rem' }}>
              Invite users
            </h2>
            <p style={{ color: '#6b6a64', fontSize: '0.8125rem', margin: '0 0 1.25rem' }}>
              Invited users can sign in with their Google account.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendInvite()}
                placeholder="email@example.com"
                type="email"
                style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
              />
              <button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()} style={{ ...primaryBtn, width: 'auto', padding: '0.5rem 1.25rem', flexShrink: 0 }}>
                {inviting ? 'Inviting…' : 'Invite'}
              </button>
            </div>

            {inviteMsg && (
              <p style={{ color: inviteMsg.ok ? '#52e0b8' : '#e05e5e', fontSize: '0.8125rem', margin: '0 0 1rem' }}>
                {inviteMsg.text}
              </p>
            )}

            {invites.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ color: '#6b6a64', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Invites
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {invites.map(inv => (
                    <div key={inv.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: '#0f0f11', borderRadius: 6, padding: '0.5rem 0.75rem',
                    }}>
                      <div>
                        <span style={{ color: '#e8e6de', fontSize: '0.875rem' }}>{inv.email}</span>
                        {inv.usedAt
                          ? <span style={{ marginLeft: '0.5rem', color: '#52e0b8', fontSize: '0.75rem' }}>Joined</span>
                          : <span style={{ marginLeft: '0.5rem', color: '#6b6a64', fontSize: '0.75rem' }}>Pending</span>
                        }
                      </div>
                      {!inv.usedAt && (
                        <button onClick={() => revokeInvite(inv.email)} style={{
                          background: 'none', border: 'none', color: '#6b6a64', cursor: 'pointer',
                          fontFamily: 'Syne, sans-serif', fontSize: '0.75rem', padding: '0.2rem 0.5rem',
                        }}>
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          style={{ background: 'none', border: '1px solid #2a2a30', borderRadius: 6, padding: '0.5rem 1.25rem', color: '#6b6a64', fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          Sign out
        </button>
      </main>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', color: '#6b6a64', fontSize: '0.75rem',
  letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.375rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#0f0f11', border: '1px solid #2a2a30', borderRadius: 6,
  padding: '0.5rem 0.75rem', color: '#e8e6de',
  fontFamily: 'Syne, sans-serif', fontSize: '0.9375rem', outline: 'none',
}

const primaryBtn: React.CSSProperties = {
  width: '100%', background: '#e8b86d', color: '#0f0f11', border: 'none',
  borderRadius: 6, padding: '0.575rem', fontFamily: 'Syne, sans-serif',
  fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer',
}

const ghostBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #2a2a30', borderRadius: 6,
  padding: '0.3rem 0.75rem', color: '#e8e6de',
  fontFamily: 'Syne, sans-serif', cursor: 'pointer',
}
