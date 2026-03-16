'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { getSocket } from '@/lib/socket'
import { ChatMessage } from './ChatMessage'

interface ChatPanelProps {
  scriptId: string
  open: boolean
  onToggle: () => void
  onUnreadChange?: (count: number) => void
}

export function ChatPanel({ scriptId, open, onToggle, onUnreadChange }: ChatPanelProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const socket = getSocket()

  useEffect(() => {
    fetch(`/api/scripts/${scriptId}/messages`).then(r => r.json()).then(d => setMessages(d.messages ?? []))
  }, [scriptId])

  useEffect(() => {
    socket.on('chat:message', (msg: any) => {
      setMessages(prev => [...prev, msg])
      if (!open) {
        setUnread(u => { const n = u + 1; onUnreadChange?.(n); return n })
      }
    })
    return () => { socket.off('chat:message') }
  }, [socket, open, onUnreadChange])

  useEffect(() => {
    if (open) { setUnread(0); onUnreadChange?.(0) }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [open, messages])

  async function send() {
    const text = input.trim()
    if (!text) return
    setInput('')
    const res = await fetch(`/api/scripts/${scriptId}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    const { message } = await res.json()
    // Broadcast to other users via socket (sender already sees it from state)
    socket.emit('chat:send', { ...message, scriptId })
    setMessages(prev => [...prev, message])
  }

  return (
    <>
      <button onClick={onToggle} style={{
        position: 'fixed', bottom: 20, right: 20,
        width: 44, height: 44, borderRadius: '50%',
        background: '#e8b86d', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', zIndex: 100,
      }}>
        💬
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#e05252', color: '#fff', borderRadius: '50%',
            width: 18, height: 18, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700,
          }}>
            {unread}
          </span>
        )}
      </button>

      <div style={{
        position: 'fixed', bottom: 72, right: 20,
        width: 300, height: 400, background: '#1a1a1f',
        border: '1px solid #2a2a30', borderRadius: 10,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        transform: open ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'all' : 'none',
        transition: 'transform 200ms ease, opacity 200ms ease',
        zIndex: 99,
      }}>
        <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #2a2a30', fontFamily: 'Syne, sans-serif', fontSize: '0.8125rem', color: '#e8e6de', fontWeight: 600 }}>
          Script Chat
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
          {messages.map(m => (
            <ChatMessage key={m.id} text={m.text} userName={m.user?.name ?? 'Unknown'} userImage={m.user?.image} createdAt={m.createdAt} isOwn={m.userId === session?.user?.id} />
          ))}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: '0.5rem', borderTop: '1px solid #2a2a30', display: 'flex', gap: '0.5rem' }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Message…"
            style={{ flex: 1, background: '#0f0f11', border: '1px solid #2a2a30', borderRadius: 6, padding: '0.35rem 0.6rem', color: '#e8e6de', fontFamily: 'Syne, sans-serif', fontSize: '0.8125rem', outline: 'none' }}
          />
          <button onClick={send} style={{ background: '#e8b86d', border: 'none', borderRadius: 6, padding: '0.35rem 0.75rem', color: '#0f0f11', fontFamily: 'Syne, sans-serif', fontSize: '0.8125rem', cursor: 'pointer', fontWeight: 600 }}>
            Send
          </button>
        </div>
      </div>
    </>
  )
}
