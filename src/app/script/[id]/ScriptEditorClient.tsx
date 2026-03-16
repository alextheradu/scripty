'use client'
import { useState, useEffect } from 'react'
import { Editor } from '@/components/editor/Editor'
import { Header } from '@/components/shared/Header'
import type { ScriptLine } from '@/lib/editor/types'

interface Props {
  scriptId: string; initialTitle: string; initialLines: ScriptLine[]
  userId: string; userName: string; userImage?: string; readOnly?: boolean
}

export function ScriptEditorClient({ scriptId, initialTitle, initialLines, userId, readOnly }: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => setStreak(d.currentStreak ?? 0))
  }, [])

  async function handleTitleChange(newTitle: string) {
    setTitle(newTitle)
    setSaveStatus('saving')
    await fetch(`/api/scripts/${scriptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
    setSaveStatus('saved')
  }

  function handleLinesChange() {
    setSaveStatus('saved')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f11' }}>
      <Header
        scriptId={scriptId}
        title={title}
        saveStatus={saveStatus}
        streakCount={streak}
        onTitleChange={handleTitleChange}
        onExport={() => {}}
        onShare={() => {}}
        onPomodoro={() => {}}
      />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Editor
            scriptId={scriptId}
            initialLines={initialLines}
            userId={userId}
            readOnly={readOnly}
            onLinesChange={handleLinesChange}
            onEdit={() => setSaveStatus('unsaved')}
          />
        </main>
      </div>
      <div style={{
        height: 28, background: '#1a1a1f', borderTop: '1px solid #2a2a30',
        display: 'flex', alignItems: 'center', padding: '0 1rem',
        gap: '1.5rem', fontSize: '0.75rem', color: '#6b6a64', fontFamily: 'Syne, sans-serif',
      }}>
        <span id="word-count">0 words</span>
        <span id="page-count">1 page</span>
        <span id="element-type">Action</span>
      </div>
    </div>
  )
}
