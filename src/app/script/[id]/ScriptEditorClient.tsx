'use client'
import { useState, useEffect } from 'react'
import { Editor } from '@/components/editor/Editor'
import { Header } from '@/components/shared/Header'
import { LeftSidebar } from '@/components/sidebar/LeftSidebar'
import { RightSidebar } from '@/components/sidebar/RightSidebar'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { getSocket } from '@/lib/socket'
import type { ScriptLine } from '@/lib/editor/types'
import { ELEMENT_LABELS } from '@/lib/editor/lineStyles'

interface Props {
  scriptId: string; initialTitle: string; initialLines: ScriptLine[]
  userId: string; userName: string; userImage?: string
  readOnly?: boolean; isAdmin?: boolean; shareToken?: string | null
}

export function ScriptEditorClient({
  scriptId, initialTitle, initialLines, userId, userName, userImage,
  readOnly, isAdmin,
}: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [lines, setLines] = useState<ScriptLine[]>(initialLines)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatUnread, setChatUnread] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [activeType, setActiveType] = useState<ScriptLine['type']>('ACTION')
  const [streak, setStreak] = useState(0)
  const socket = getSocket()

  useEffect(() => {
    socket.emit('script:join', { scriptId, user: { id: userId, name: userName, image: userImage } })
    socket.on('presence:update', (users: any[]) => setOnlineUsers(users.filter(u => u.id !== userId)))
    fetch('/api/stats').then(r => r.json()).then(d => setStreak(d.currentStreak ?? 0))
    return () => {
      socket.emit('script:leave', { scriptId })
      socket.off('presence:update')
    }
  }, [scriptId, userId, userName, userImage, socket])

  async function handleTitleChange(t: string) {
    setTitle(t)
    setSaveStatus('saving')
    await fetch(`/api/scripts/${scriptId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t }),
    })
    setSaveStatus('saved')
  }

  function handleLinesChange(newLines: ScriptLine[]) {
    setLines(newLines)
    setSaveStatus('saved')
    const last = newLines[newLines.length - 1]
    if (last) setActiveType(last.type)
  }

  function handleSceneReorder(from: number, to: number) {
    setLines(prev => {
      const next = [...prev]
      const [removed] = next.splice(from, 1)
      next.splice(to, 0, removed)
      return next
    })
  }

  const wordCount = lines.reduce((acc, l) => acc + (l.text.split(/\s+/).filter(Boolean).length), 0)
  const pageCount = Math.max(1, Math.ceil(lines.length / 55))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f11' }}>
      <Header
        scriptId={scriptId} title={title} saveStatus={saveStatus}
        streakCount={streak}
        onTitleChange={handleTitleChange}
        onExport={() => {}}
        onShare={() => {}}
        onPomodoro={() => {}}
      />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <button onClick={() => setLeftOpen(o => !o)} style={toggleBtn('left')}>
          {leftOpen ? '‹' : '›'}
        </button>

        <LeftSidebar
          lines={lines} scriptId={scriptId} open={leftOpen}
          onSceneClick={lineId => document.querySelector(`[data-line-id="${lineId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          onSceneReorder={handleSceneReorder}
          onInsertCharacter={() => {}}
        />

        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Editor
            scriptId={scriptId} initialLines={initialLines}
            userId={userId} readOnly={readOnly}
            onLinesChange={handleLinesChange}
            onEdit={() => setSaveStatus('unsaved')}
          />
        </main>

        <RightSidebar
          scriptId={scriptId} open={rightOpen}
          onlineUsers={onlineUsers} isAdmin={!!isAdmin}
          onRestore={content => { setLines(content); setSaveStatus('unsaved') }}
        />

        <button onClick={() => setRightOpen(o => !o)} style={toggleBtn('right')}>
          {rightOpen ? '›' : '‹'}
        </button>
      </div>

      <div style={{
        height: 28, background: '#1a1a1f', borderTop: '1px solid #2a2a30',
        display: 'flex', alignItems: 'center', padding: '0 1rem',
        gap: '1.5rem', fontSize: '0.75rem', color: '#6b6a64', fontFamily: 'Syne, sans-serif',
      }}>
        <span>{wordCount.toLocaleString()} words</span>
        <span>{pageCount} pages</span>
        <span>{ELEMENT_LABELS[activeType]}</span>
      </div>

      <ChatPanel
        scriptId={scriptId} open={chatOpen}
        onToggle={() => setChatOpen(o => !o)}
        onUnreadChange={setChatUnread}
      />
    </div>
  )
}

function toggleBtn(side: 'left' | 'right'): React.CSSProperties {
  return {
    width: 18, background: '#1a1a1f',
    border: 'none',
    borderRight: side === 'left' ? '1px solid #2a2a30' : 'none',
    borderLeft: side === 'right' ? '1px solid #2a2a30' : 'none',
    color: '#6b6a64', cursor: 'pointer', fontSize: '0.875rem',
    flexShrink: 0, alignSelf: 'stretch',
  }
}
