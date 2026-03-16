'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Avatar } from './Avatar'

interface HeaderProps {
  scriptId: string
  title: string
  saveStatus: 'saved' | 'saving' | 'unsaved'
  streakCount?: number
  onTitleChange: (title: string) => void
  onExport: () => void
  onShare: () => void
  onPomodoro: () => void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Header({ scriptId: _scriptId, title, saveStatus, streakCount, onTitleChange, onExport, onShare, onPomodoro }: HeaderProps) {
  const { data: session } = useSession()
  const [editing, setEditing] = useState(false)
  const [localTitle, setLocalTitle] = useState(title)

  const statusColor = { saved: '#52e0b8', saving: '#e8b86d', unsaved: '#6b6a64' }[saveStatus]
  const statusText = { saved: 'Saved ✓', saving: 'Saving…', unsaved: '●' }[saveStatus]

  function commitTitle() {
    setEditing(false)
    if (localTitle.trim() && localTitle !== title) onTitleChange(localTitle.trim())
  }

  return (
    <header style={{
      height: 52, background: '#1a1a1f', borderBottom: '1px solid #2a2a30',
      display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '0.75rem',
    }}>
      <Link href="/" style={{ color: '#e8b86d', fontFamily: '"Playfair Display", serif', fontSize: '1.25rem', textDecoration: 'none', flexShrink: 0 }}>
        S
      </Link>
      <div style={{ width: 1, height: 20, background: '#2a2a30', flexShrink: 0 }} />

      {editing ? (
        <input
          value={localTitle}
          onChange={e => setLocalTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={e => e.key === 'Enter' && commitTitle()}
          autoFocus
          style={{
            background: 'none', border: 'none', borderBottom: '1px solid #e8b86d',
            color: '#e8e6de', fontFamily: '"Playfair Display", serif',
            fontSize: '1rem', outline: 'none', padding: '2px 4px', width: 280,
          }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{ fontFamily: '"Playfair Display", serif', fontSize: '1rem', color: '#e8e6de', cursor: 'text', padding: '2px 4px' }}
        >
          {title}
        </span>
      )}

      <span style={{ fontSize: '0.75rem', color: statusColor, marginLeft: '0.25rem' }}>{statusText}</span>
      <div style={{ flex: 1 }} />

      {!!streakCount && <span style={{ fontSize: '0.875rem', color: '#e8b86d' }}>🔥 {streakCount}</span>}

      <button onClick={onExport} style={btnStyle}>Export</button>
      <button onClick={onShare} style={btnStyle}>Share</button>
      <button onClick={onPomodoro} style={btnStyle}>⏱</button>

      {session?.user && <Avatar src={session.user.image} name={session.user.name ?? '?'} size={28} />}
    </header>
  )
}

const btnStyle: React.CSSProperties = {
  background: 'none', border: '1px solid #2a2a30', borderRadius: 4,
  padding: '0.25rem 0.625rem', color: '#e8e6de',
  fontFamily: 'Syne, sans-serif', fontSize: '0.8125rem', cursor: 'pointer',
}
