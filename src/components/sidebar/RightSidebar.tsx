'use client'
import { useState, useEffect } from 'react'
import { Avatar } from '@/components/shared/Avatar'
import { parseScriptContent } from '@/lib/editor/content'
import type { ScriptLine } from '@/lib/editor/types'

function safeParseContent(content: string): ScriptLine[] {
  return parseScriptContent(content)
}

interface OnlineUser {
  id: string
  name: string
  image?: string
  color: string
  socketId?: string
}

interface Collaborator {
  id: string
  role: string
  user?: { name?: string; image?: string }
}

interface Revision {
  id: string
  content: string
  createdAt: string
}

interface RightSidebarProps {
  scriptId: string
  open: boolean
  onlineUsers: OnlineUser[]
  isAdmin: boolean
  onRestore: (content: ScriptLine[]) => void
}

export function RightSidebar({ scriptId, open, onlineUsers, isAdmin, onRestore }: RightSidebarProps) {
  const [tab, setTab] = useState<'people' | 'history'>('people')
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [previewing, setPreviewing] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/scripts/${scriptId}/collaborators`).then(r => r.json()).then(d => setCollaborators(d.collaborators ?? []))
    fetch(`/api/scripts/${scriptId}/revisions`).then(r => r.json()).then(d => setRevisions(d.revisions ?? []))
  }, [scriptId])

  async function handleInvite() {
    setInviteError('')
    const res = await fetch(`/api/scripts/${scriptId}/collaborators`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    })
    if (!res.ok) { const d = await res.json(); setInviteError(d.error ?? 'Failed'); return }
    setInviteEmail('')
    const d = await res.json()
    setCollaborators(prev => [...prev, d.collab])
  }

  return (
    <div style={{
      width: open ? 220 : 0, overflow: 'hidden',
      transition: 'width 200ms ease',
      background: '#1a1a1f', borderLeft: '1px solid #2a2a30',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ minWidth: 220 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #2a2a30' }}>
          {(['people', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '0.5rem', background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid #e8b86d' : '2px solid transparent',
              color: tab === t ? '#e8b86d' : '#6b6a64',
              fontFamily: 'Syne, sans-serif', fontSize: '0.6875rem',
              cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {t === 'people' ? 'People' : 'History'}
            </button>
          ))}
        </div>

        {tab === 'people' && (
          <div style={{ padding: '0.75rem 1rem' }}>
            <p style={{ fontSize: '0.6875rem', color: '#6b6a64', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Online</p>
            {onlineUsers.map(u => (
              <div key={u.socketId ?? u.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: u.color }} />
                <Avatar src={u.image} name={u.name ?? '?'} size={22} color={u.color} />
                <span style={{ fontSize: '0.75rem', color: '#e8e6de' }}>{u.name}</span>
              </div>
            ))}
            <p style={{ fontSize: '0.6875rem', color: '#6b6a64', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0.75rem 0 0.5rem' }}>All</p>
            {collaborators.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <Avatar src={c.user?.image} name={c.user?.name ?? '?'} size={22} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#e8e6de' }}>{c.user?.name}</div>
                  <div style={{ fontSize: '0.625rem', color: '#6b6a64' }}>{c.role}</div>
                </div>
              </div>
            ))}
            {isAdmin && (
              <div style={{ marginTop: '0.75rem' }}>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  placeholder="Invite by email…"
                  style={{ width: '100%', background: '#0f0f11', border: '1px solid #2a2a30', borderRadius: 4, padding: '0.3rem 0.5rem', color: '#e8e6de', fontFamily: 'Syne, sans-serif', fontSize: '0.75rem', outline: 'none', marginBottom: '0.35rem' }}
                />
                {inviteError && <p style={{ fontSize: '0.6875rem', color: '#e05252', margin: '0 0 0.35rem' }}>{inviteError}</p>}
                <button onClick={handleInvite} style={{ background: '#e8b86d', color: '#0f0f11', border: 'none', borderRadius: 4, padding: '0.3rem 0.75rem', fontFamily: 'Syne, sans-serif', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Invite</button>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 108px)' }}>
            {revisions.length === 0 && <p style={{ fontSize: '0.75rem', color: '#6b6a64', padding: '0.75rem 1rem' }}>No snapshots yet (auto-saves every 5 min).</p>}
            {revisions.map(rev => (
              <div key={rev.id} style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #2a2a30' }}>
                <div style={{ fontSize: '0.75rem', color: '#e8e6de', marginBottom: '0.25rem' }}>
                  {new Date(rev.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setPreviewing(previewing === rev.id ? null : rev.id)} style={smallBtn}>
                    {previewing === rev.id ? 'Close' : 'Preview'}
                  </button>
                  <button onClick={() => onRestore(safeParseContent(rev.content) as ScriptLine[])} style={{ ...smallBtn, color: '#e8b86d' }}>Restore</button>
                </div>
                {previewing === rev.id && (
                  <div style={{ marginTop: '0.4rem', background: '#0f0f11', borderRadius: 4, padding: '0.4rem', fontSize: '0.625rem', color: '#6b6a64', fontFamily: '"Courier Prime", monospace', maxHeight: 180, overflowY: 'auto' }}>
                    {(safeParseContent(rev.content) as ScriptLine[]).slice(0, 20).map(l => <div key={l.id}>{l.text || '—'}</div>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const smallBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #2a2a30', borderRadius: 3,
  padding: '0.15rem 0.5rem', color: '#6b6a64',
  fontFamily: 'Syne, sans-serif', fontSize: '0.625rem', cursor: 'pointer',
}
