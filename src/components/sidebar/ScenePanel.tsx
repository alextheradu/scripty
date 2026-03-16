'use client'
import { useState } from 'react'
import type { ScriptLine } from '@/lib/editor/types'

interface ScenePanelProps {
  lines: ScriptLine[]
  onSceneClick: (lineId: string) => void
  onReorder: (fromLineIdx: number, toLineIdx: number) => void
}

export function ScenePanel({ lines, onSceneClick, onReorder }: ScenePanelProps) {
  const [dragging, setDragging] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const scenes = lines.reduce<{ lineId: string; heading: string; preview: string; sceneIdx: number; lineIdx: number }[]>(
    (acc, line, i) => {
      if (line.type === 'SCENE_HEADING' && line.text.trim()) {
        const next = lines[i + 1]
        acc.push({
          lineId: line.id, heading: line.text,
          preview: next?.type === 'ACTION' ? next.text.slice(0, 60) : '',
          sceneIdx: acc.length + 1, lineIdx: i,
        })
      }
      return acc
    }, []
  )

  function handleDrop(toIdx: number) {
    if (dragging === null || dragging === toIdx) return
    onReorder(scenes[dragging].lineIdx, scenes[toIdx].lineIdx)
    setDragging(null); setDragOver(null)
  }

  if (scenes.length === 0) return (
    <p style={{ fontSize: '0.75rem', color: '#6b6a64', padding: '0.75rem 1rem' }}>
      No scenes yet.
    </p>
  )

  return (
    <div style={{ padding: '0.25rem 0' }}>
      {scenes.map((scene, i) => (
        <div
          key={scene.lineId}
          draggable
          onDragStart={() => setDragging(i)}
          onDragOver={e => { e.preventDefault(); setDragOver(i) }}
          onDrop={() => handleDrop(i)}
          onDragEnd={() => { setDragging(null); setDragOver(null) }}
          onClick={() => onSceneClick(scene.lineId)}
          style={{
            padding: '0.4rem 1rem', cursor: 'pointer',
            borderLeft: dragOver === i ? '2px solid #e8b86d' : '2px solid transparent',
            opacity: dragging === i ? 0.5 : 1,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#2a2a30')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ fontSize: '0.6875rem', color: '#e8b86d', fontFamily: 'Syne, sans-serif', marginBottom: 2 }}>
            {scene.sceneIdx}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#e8e6de', fontFamily: '"Courier Prime", monospace', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {scene.heading}
          </div>
          {scene.preview && (
            <div style={{ fontSize: '0.6875rem', color: '#6b6a64', fontFamily: '"Courier Prime", monospace', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {scene.preview}…
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
