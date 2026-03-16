import { Avatar } from '@/components/shared/Avatar'
import React from 'react'

interface ChatMessageProps {
  text: string
  userName: string
  userImage?: string
  createdAt: string
  isOwn: boolean
}

function parseText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*[^*]+\*|_[^_]+_|https?:\/\/[^\s]+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) return <strong key={i}>{part.slice(1, -1)}</strong>
    if (part.startsWith('_') && part.endsWith('_')) return <em key={i}>{part.slice(1, -1)}</em>
    if (/^https?:\/\//.test(part)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#e8b86d' }}>{part}</a>
    return part
  })
}

export function ChatMessage({ text, userName, userImage, createdAt, isOwn }: ChatMessageProps) {
  return (
    <div style={{
      display: 'flex', gap: '0.5rem', padding: '0.4rem 0.75rem',
      flexDirection: isOwn ? 'row-reverse' : 'row',
    }}>
      <Avatar src={userImage} name={userName} size={24} />
      <div style={{ maxWidth: '80%' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', flexDirection: isOwn ? 'row-reverse' : 'row' }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#e8e6de' }}>{userName}</span>
          <span style={{ fontSize: '0.5625rem', color: '#6b6a64' }}>
            {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div style={{
          background: isOwn ? '#e8b86d22' : '#2a2a30',
          borderRadius: isOwn ? '8px 2px 8px 8px' : '2px 8px 8px 8px',
          padding: '0.35rem 0.6rem', fontSize: '0.8125rem',
          color: '#e8e6de', lineHeight: 1.4, marginTop: '0.15rem',
        }}>
          {parseText(text)}
        </div>
      </div>
    </div>
  )
}
