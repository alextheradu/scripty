'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar } from './Avatar'

interface ShareModalProps {
  scriptId: string
  scriptTitle?: string
  shareToken: string | null
  open: boolean
  onClose: () => void
  isAdmin: boolean
}

interface Collaborator {
  id: string
  role: string
  user?: {
    id?: string
    email?: string
    name?: string
    image?: string
    displayName?: string
    profileImage?: string
  }
}

export function ShareModal({ scriptId, scriptTitle, shareToken: initial, open, onClose, isAdmin }: ShareModalProps) {
  const { data: session } = useSession()
  const [shareToken, setShareToken] = useState(initial)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [submitting, setSubmitting] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'edit' | 'public'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [pendingCollaboratorId, setPendingCollaboratorId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setShareToken(initial)
  }, [initial, open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingPeople(true)
    fetch(`/api/scripts/${scriptId}/collaborators`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to load people')
        if (!cancelled) setCollaborators(data.collaborators ?? [])
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingPeople(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, scriptId])

  async function togglePublic(enable: boolean) {
    setError(null)
    const res = await fetch(`/api/scripts/${scriptId}/share`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable }),
    })
    const d = await res.json()
    if (!res.ok) {
      setError(d.error ?? 'Failed to update general access')
      return
    }
    setShareToken(d.shareToken ?? null)
  }

  async function inviteCollaborator() {
    if (!inviteEmail.trim() || !isAdmin) return
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/scripts/${scriptId}/collaborators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    })
    const d = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      setError(d.error ?? 'Failed to share script')
      return
    }
    setInviteEmail('')
    setCollaborators(prev => {
      const next = prev.filter(collab => collab.user?.email?.toLowerCase() !== d.collab?.user?.email?.toLowerCase())
      return [...next, d.collab]
    })
  }

  async function updateCollaboratorRole(collaboratorId: string, role: 'viewer' | 'editor' | 'admin') {
    setPendingCollaboratorId(collaboratorId)
    setError(null)
    const res = await fetch(`/api/scripts/${scriptId}/collaborators`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collaboratorId, role }),
    })
    const data = await res.json()
    setPendingCollaboratorId(null)
    if (!res.ok) {
      setError(data.error ?? 'Failed to update collaborator')
      return
    }

    setCollaborators(prev => prev.map(collab => collab.id === collaboratorId ? data.collab : collab))
  }

  async function removeCollaborator(collaboratorId: string) {
    setPendingCollaboratorId(collaboratorId)
    setError(null)
    const res = await fetch(`/api/scripts/${scriptId}/collaborators?collaboratorId=${encodeURIComponent(collaboratorId)}`, {
      method: 'DELETE',
    })
    const data = await res.json()
    setPendingCollaboratorId(null)
    if (!res.ok) {
      setError(data.error ?? 'Failed to remove collaborator')
      return
    }

    setCollaborators(prev => prev.filter(collab => collab.id !== collaboratorId))
  }

  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const publicShareUrl = shareToken ? `${origin}/share/${shareToken}` : null
  const editorShareUrl = `${origin}/script/${scriptId}`

  const peopleWithAccess = useMemo(() => {
    const currentUserEmail = session?.user?.email?.toLowerCase()
    const ownerEntry = session?.user ? {
      id: 'current-user',
      role: 'owner',
      user: {
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        displayName: session.user.displayName,
        profileImage: session.user.profileImage,
      },
    } : null

    const otherCollaborators = collaborators.filter(collab => collab.user?.email?.toLowerCase() !== currentUserEmail)
    return ownerEntry ? [ownerEntry, ...otherCollaborators] : otherCollaborators
  }, [collaborators, session])

  async function copyLink(kind: 'edit' | 'public') {
    const value = kind === 'edit' ? editorShareUrl : publicShareUrl
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopyState(kind)
    setTimeout(() => setCopyState('idle'), 1500)
  }

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 16, padding: '1.5rem', width: 640, maxWidth: '94vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.45rem', margin: 0, color: '#e8e6de' }}>
              Share
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#6b6a64', fontFamily: 'Syne, sans-serif', margin: '0.35rem 0 0' }}>
              {scriptTitle ? `Invite people to collaborate on “${scriptTitle}”.` : 'Invite people to collaborate on this script.'}
            </p>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>Close</button>
        </div>

        <div style={sectionStyle}>
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#e8e6de', fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>
              Share with people
            </div>
            <div style={{ fontSize: '0.74rem', color: '#6b6a64', marginTop: '0.2rem' }}>
              Give specific people access to open this script and collaborate live.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && inviteCollaborator()}
              placeholder="Add people by email"
              disabled={!isAdmin}
              style={{ ...inputStyle, flex: '1 1 280px', color: '#e8e6de' }}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'editor' | 'viewer')}
              disabled={!isAdmin}
              style={{ ...inputStyle, width: 120, color: '#e8e6de' }}
            >
              <option value="editor">Can edit</option>
              <option value="viewer">Can view</option>
            </select>
            <button onClick={inviteCollaborator} disabled={!isAdmin || submitting || !inviteEmail.trim()} style={primaryBtnStyle}>
              {submitting ? 'Sending…' : 'Send'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              value={editorShareUrl}
              readOnly
              style={{ ...inputStyle, flex: '1 1 360px', color: '#6b6a64' }}
            />
            <button onClick={() => copyLink('edit')} style={secondaryBtnStyle}>
              {copyState === 'edit' ? 'Copied' : 'Copy edit link'}
            </button>
          </div>

          {loadingPeople ? (
            <div style={emptyStateStyle}>Loading people…</div>
          ) : peopleWithAccess.length === 0 ? (
            <div style={emptyStateStyle}>Only you have access right now.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {peopleWithAccess.map(person => {
                const displayName = person.user?.displayName ?? person.user?.name ?? person.user?.email ?? 'Unknown user'
                const image = person.user?.profileImage ?? person.user?.image
                const isOwner = person.role === 'owner'
                const isPending = pendingCollaboratorId === person.id
                const roleLabel = person.role === 'owner'
                  ? 'Owner'
                  : person.role === 'editor'
                    ? 'Can edit'
                    : person.role === 'admin'
                      ? 'Admin'
                      : 'Can view'

                return (
                  <div key={person.id} style={personRowStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                      <Avatar src={image} name={displayName} size={34} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#e8e6de', fontSize: '0.84rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {displayName}
                        </div>
                      <div style={{ color: '#6b6a64', fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {person.user?.email}
                        </div>
                      </div>
                    </div>
                    {isAdmin && !isOwner ? (
                      <select
                        value={isPending ? '__pending' : person.role}
                        disabled={isPending}
                        onChange={e => {
                          const value = e.target.value
                          if (value === 'remove') {
                            void removeCollaborator(person.id)
                            return
                          }
                          if (value === person.role) return
                          void updateCollaboratorRole(person.id, value as 'viewer' | 'editor' | 'admin')
                        }}
                        style={manageSelectStyle}
                      >
                        {person.role === 'admin' && <option value="admin">Admin</option>}
                        <option value="editor">Can edit</option>
                        <option value="viewer">Can view</option>
                        <option value="remove">Remove access</option>
                        {isPending && <option value="__pending">Updating…</option>}
                      </select>
                    ) : (
                      <div style={rolePillStyle}>{roleLabel}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!isAdmin && (
            <p style={{ color: '#6b6a64', fontSize: '0.72rem', margin: '0.85rem 0 0' }}>
              Only script admins can change sharing settings.
            </p>
          )}
        </div>

        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#e8e6de', fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>
                General access
              </div>
              <div style={{ fontSize: '0.74rem', color: '#6b6a64', marginTop: '0.2rem' }}>
                Anyone with the public link can view this script in read-only mode.
              </div>
            </div>
            <button
              onClick={() => togglePublic(!shareToken)}
              disabled={!isAdmin}
              style={{
                width: 42,
                height: 24,
                borderRadius: 999,
                border: 'none',
                cursor: isAdmin ? 'pointer' : 'not-allowed',
                background: shareToken ? '#e8b86d' : '#2a2a30',
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute',
                top: 3,
                left: shareToken ? 21 : 3,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 200ms ease',
              }} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              value={publicShareUrl ?? 'Public link is off'}
              readOnly
              style={{ ...inputStyle, flex: '1 1 360px', color: publicShareUrl ? '#6b6a64' : '#4b4a45' }}
            />
            <button onClick={() => copyLink('public')} disabled={!publicShareUrl} style={secondaryBtnStyle}>
              {copyState === 'public' ? 'Copied' : 'Copy public link'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ color: '#e05252', fontSize: '0.78rem', fontFamily: 'Syne, sans-serif', marginTop: '1rem' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

const sectionStyle: React.CSSProperties = {
  background: '#111116',
  border: '1px solid #2a2a30',
  borderRadius: 12,
  padding: '1rem',
  marginBottom: '0.95rem',
}

const inputStyle: React.CSSProperties = {
  background: '#0f0f11',
  border: '1px solid #2a2a30',
  borderRadius: 10,
  padding: '0.7rem 0.85rem',
  fontFamily: 'Syne, sans-serif',
  fontSize: '0.8rem',
  outline: 'none',
}

const primaryBtnStyle: React.CSSProperties = {
  background: '#e8b86d',
  border: 'none',
  borderRadius: 999,
  padding: '0.7rem 1rem',
  color: '#0f0f11',
  fontFamily: 'Syne, sans-serif',
  fontSize: '0.8rem',
  cursor: 'pointer',
  fontWeight: 700,
  whiteSpace: 'nowrap',
}

const secondaryBtnStyle: React.CSSProperties = {
  background: '#1a1a1f',
  border: '1px solid #2a2a30',
  borderRadius: 999,
  padding: '0.7rem 0.95rem',
  color: '#e8e6de',
  fontFamily: 'Syne, sans-serif',
  fontSize: '0.78rem',
  cursor: 'pointer',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #2a2a30',
  borderRadius: 999,
  padding: '0.55rem 0.95rem',
  color: '#e8e6de',
  fontFamily: 'Syne, sans-serif',
  fontSize: '0.78rem',
  cursor: 'pointer',
  height: 'fit-content',
}

const emptyStateStyle: React.CSSProperties = {
  borderRadius: 10,
  border: '1px dashed #2a2a30',
  padding: '0.9rem',
  color: '#6b6a64',
  fontSize: '0.78rem',
}

const personRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  padding: '0.2rem 0',
}

const rolePillStyle: React.CSSProperties = {
  flexShrink: 0,
  borderRadius: 999,
  border: '1px solid #2a2a30',
  padding: '0.35rem 0.65rem',
  color: '#8f8d86',
  fontSize: '0.72rem',
  fontWeight: 600,
  fontFamily: 'Syne, sans-serif',
}

const manageSelectStyle: React.CSSProperties = {
  flexShrink: 0,
  background: '#0f0f11',
  border: '1px solid #2a2a30',
  borderRadius: 999,
  padding: '0.5rem 0.8rem',
  color: '#e8e6de',
  fontFamily: 'Syne, sans-serif',
  fontSize: '0.74rem',
  outline: 'none',
  cursor: 'pointer',
}
