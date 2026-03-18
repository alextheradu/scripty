'use client'
import { useState } from 'react'
import { AppNav } from './AppNav'
import { Avatar } from './Avatar'

interface OnlineUser {
  id: string
  name: string
  image?: string
  color: string
  socketId?: string
  hasCursor?: boolean
}

interface HeaderProps {
  scriptId: string
  title: string
  saveStatus: 'saved' | 'saving' | 'unsaved'
  streakCount?: number
  onlineUsers?: OnlineUser[]
  onUserJump?: (userId: string) => void
  onTitleChange: (title: string) => void
  onExport: () => void
  onShare: () => void
  onPomodoro: () => void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Header({ scriptId: _scriptId, title, saveStatus, streakCount, onlineUsers = [], onUserJump, onTitleChange, onExport, onShare, onPomodoro }: HeaderProps) {
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
      background: '#1a1a1f',
      borderBottom: '1px solid #2a2a30',
    }}>
      <AppNav
        actions={
          <>
            {editing ? (
              <input
                value={localTitle}
                onChange={e => setLocalTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={e => e.key === 'Enter' && commitTitle()}
                autoFocus
                style={titleInputStyle}
              />
            ) : (
              <button onClick={() => setEditing(true)} style={titleButtonStyle} title="Rename script">
                {title}
              </button>
            )}
            <span style={{ ...statusPillStyle, color: statusColor }}>{statusText}</span>
            {!!streakCount && <span style={streakPillStyle}>🔥 {streakCount} day streak</span>}
            {onlineUsers.length > 0 && (
              <div style={presenceWrapStyle} title={`${onlineUsers.length} collaborator${onlineUsers.length === 1 ? '' : 's'} online`}>
                {onlineUsers.map((user, index) => (
                  <button
                    key={user.id}
                    onClick={() => user.hasCursor && onUserJump?.(user.id)}
                    title={user.hasCursor ? `Jump to ${user.name}` : `${user.name} is online`}
                    style={{
                      ...presenceAvatarButtonStyle,
                      marginLeft: index === 0 ? 0 : '-0.3rem',
                      cursor: user.hasCursor ? 'pointer' : 'default',
                    }}
                  >
                    <div style={{ ...presenceAvatarStyle, outline: user.hasCursor ? `2px solid ${user.color}` : 'none' }}>
                      <Avatar src={user.image} name={user.name ?? '?'} size={28} color={user.color} />
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={onExport} style={btnStyle}>Export</button>
            <button onClick={onShare} style={btnStyle}>Share</button>
            <button onClick={onPomodoro} style={btnStyle}>Focus</button>
          </>
        }
      />
    </header>
  )
}

const btnStyle: React.CSSProperties = {
  background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 999,
  padding: '0.24rem 0.58rem', color: '#e8e6de',
  fontFamily: 'Syne, sans-serif', fontSize: '0.76rem', cursor: 'pointer',
}

const statusPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.32rem 0.7rem',
  borderRadius: 999,
  border: '1px solid #2a2a30',
  background: '#17171c',
  fontSize: '0.72rem',
  fontWeight: 600,
}

const streakPillStyle: React.CSSProperties = {
  ...statusPillStyle,
  color: '#e8b86d',
}

const presenceWrapStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.18rem 0.3rem',
  borderRadius: 999,
  border: '1px solid #2a2a30',
  background: '#17171c',
}

const presenceAvatarStyle: React.CSSProperties = {
  display: 'inline-flex',
  borderRadius: '50%',
}

const presenceAvatarButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: 0,
  border: 'none',
  background: 'none',
}

const titleInputStyle: React.CSSProperties = {
  background: '#111116',
  border: '1px solid #2a2a30',
  borderRadius: 999,
  color: '#e8e6de',
  fontFamily: '"Playfair Display", serif',
  fontSize: '0.95rem',
  outline: 'none',
  padding: '0.38rem 0.8rem',
  width: 'min(26vw, 300px)',
  minWidth: 160,
}

const titleButtonStyle: React.CSSProperties = {
  background: '#111116',
  border: '1px solid #2a2a30',
  borderRadius: 999,
  padding: '0.34rem 0.8rem',
  color: '#e8e6de',
  cursor: 'text',
  textAlign: 'left',
  fontFamily: '"Playfair Display", serif',
  fontSize: '0.92rem',
  maxWidth: 260,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}
