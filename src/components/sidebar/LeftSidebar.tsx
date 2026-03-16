'use client'
import { useState } from 'react'
import type { ScriptLine } from '@/lib/editor/types'
import { ScenePanel } from './ScenePanel'
import { CharacterPanel } from './CharacterPanel'

interface LeftSidebarProps {
  lines: ScriptLine[]; scriptId: string; open: boolean
  onSceneClick: (lineId: string) => void
  onSceneReorder: (from: number, to: number) => void
  onInsertCharacter: (name: string) => void
}

export function LeftSidebar({ lines, scriptId, open, onSceneClick, onSceneReorder, onInsertCharacter }: LeftSidebarProps) {
  const [tab, setTab] = useState<'scenes' | 'characters'>('scenes')

  return (
    <div style={{
      width: open ? 220 : 0, overflow: 'hidden',
      transition: 'width 200ms ease',
      background: '#1a1a1f', borderRight: '1px solid #2a2a30',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ minWidth: 220 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #2a2a30' }}>
          {(['scenes', 'characters'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '0.5rem', background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid #e8b86d' : '2px solid transparent',
              color: tab === t ? '#e8b86d' : '#6b6a64',
              fontFamily: 'Syne, sans-serif', fontSize: '0.75rem',
              cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 108px)' }}>
          {tab === 'scenes' && <ScenePanel lines={lines} onSceneClick={onSceneClick} onReorder={onSceneReorder} />}
          {tab === 'characters' && <CharacterPanel lines={lines} scriptId={scriptId} onInsertCharacter={onInsertCharacter} />}
        </div>
      </div>
    </div>
  )
}
