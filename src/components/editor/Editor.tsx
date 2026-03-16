'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ScriptLine, ElementType } from '@/lib/editor/types'
import { ENTER_NEXT, DOUBLE_ENTER_NEXT, ELEMENT_CYCLE } from '@/lib/editor/types'
import { EditorLine, EditorLineHandle } from './EditorLine'
import { Toolbar } from './Toolbar'
import { Autocomplete } from './Autocomplete'
import { PageBreak } from './PageBreak'
import { getSocket } from '@/lib/socket'

const LINES_PER_PAGE = 55

interface EditorProps {
  scriptId: string
  initialLines: ScriptLine[]
  userId: string
  readOnly?: boolean
  onLinesChange?: (lines: ScriptLine[]) => void
}

export function Editor({ scriptId, initialLines, userId, readOnly, onLinesChange }: EditorProps) {
  const [lines, setLines] = useState<ScriptLine[]>(
    initialLines.length ? initialLines : [{ id: crypto.randomUUID(), type: 'ACTION', text: '' }]
  )
  const [activeId, setActiveId] = useState<string>(lines[0]?.id ?? '')
  const [autocomplete, setAutocomplete] = useState<{
    suggestions: string[]; query: string; position: { top: number; left: number }
  } | null>(null)
  const [lastEnterEmpty, setLastEnterEmpty] = useState<string | null>(null)
  const lineRefs = useRef<Map<string, EditorLineHandle>>(new Map())
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const socket = getSocket()

  const activeLine = lines.find(l => l.id === activeId)
  const locations = lines.filter(l => l.type === 'SCENE_HEADING').map(l => l.text).filter(Boolean)
  const characters = lines.filter(l => l.type === 'CHARACTER').map(l => l.text.toUpperCase()).filter(Boolean)

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setLines(current => {
        onLinesChange?.(current)
        fetch(`/api/scripts/${scriptId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: current }),
        })
        return current
      })
    }, 2000)
  }, [scriptId, onLinesChange])

  function updateAutocomplete(id: string, text: string, currentLines: ScriptLine[]) {
    const line = currentLines.find(l => l.id === id)
    if (!line) return

    if (line.type === 'SCENE_HEADING') {
      const el = document.querySelector(`[data-line-id="${id}"]`)
      if (!el) return
      const rect = el.getBoundingClientRect()
      const PREFIXES = ['INT. ', 'EXT. ', 'INT./EXT. ']
      const suggestions = [
        ...PREFIXES.filter(p => p.toLowerCase().startsWith(text.toLowerCase())),
        ...locations,
      ]
      if (suggestions.length > 0) {
        setAutocomplete({ suggestions, query: text, position: { top: rect.bottom + 4, left: rect.left } })
      } else {
        setAutocomplete(null)
      }
    } else if (line.type === 'CHARACTER') {
      const el = document.querySelector(`[data-line-id="${id}"]`)
      if (!el) return
      const rect = el.getBoundingClientRect()
      const unique = Array.from(new Set(characters))
      if (unique.length > 0) {
        setAutocomplete({ suggestions: unique, query: text.toUpperCase(), position: { top: rect.bottom + 4, left: rect.left } })
      } else {
        setAutocomplete(null)
      }
    } else {
      setAutocomplete(null)
    }
  }

  const updateLine = useCallback((id: string, text: string) => {
    setLines(prev => {
      const next = prev.map(l => l.id === id ? { ...l, text } : l)
      const line = next.find(l => l.id === id)
      if (line) {
        socket.emit('line:update', { scriptId, lineId: id, type: line.type, text, authorId: userId })
      }
      updateAutocomplete(id, text, next)
      return next
    })
    scheduleSave()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptId, userId, scheduleSave, socket])

  function handleKeyDown(e: React.KeyboardEvent, id: string) {
    const line = lines.find(l => l.id === id)
    if (!line) return
    const idx = lines.findIndex(l => l.id === id)

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      setAutocomplete(null)

      const isEmpty = line.text.trim() === ''
      const isDoubleEnter = lastEnterEmpty === id

      if (isDoubleEnter && DOUBLE_ENTER_NEXT[line.type]) {
        const newType = DOUBLE_ENTER_NEXT[line.type]!
        setLines(prev => prev.map(l => l.id === id ? { ...l, type: newType } : l))
        setLastEnterEmpty(null)
        return
      }

      if (isEmpty && !isDoubleEnter) {
        setLastEnterEmpty(id)
      } else {
        setLastEnterEmpty(null)
      }

      const newId = crypto.randomUUID()
      const newType = ENTER_NEXT[line.type]
      const newLine: ScriptLine = { id: newId, type: newType, text: '' }
      setLines(prev => [...prev.slice(0, idx + 1), newLine, ...prev.slice(idx + 1)])
      setActiveId(newId)
      setTimeout(() => lineRefs.current.get(newId)?.focus(), 0)
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      setAutocomplete(null)
      const dir = e.shiftKey ? -1 : 1
      const currentIdx = ELEMENT_CYCLE.indexOf(line.type)
      const nextType = ELEMENT_CYCLE[(currentIdx + dir + ELEMENT_CYCLE.length) % ELEMENT_CYCLE.length]
      setLines(prev => prev.map(l => l.id === id ? { ...l, type: nextType } : l))
    }

    if (e.key === 'Backspace' && line.text === '' && lines.length > 1) {
      e.preventDefault()
      if (idx > 0) {
        const prevLine = lines[idx - 1]
        setLines(prev => prev.filter(l => l.id !== id))
        setActiveId(prevLine.id)
        setTimeout(() => lineRefs.current.get(prevLine.id)?.focus(), 0)
      }
    }

    if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault()
      const prevId = lines[idx - 1].id
      setActiveId(prevId)
      lineRefs.current.get(prevId)?.focus()
    }

    if (e.key === 'ArrowDown' && idx < lines.length - 1) {
      e.preventDefault()
      const nextId = lines[idx + 1].id
      setActiveId(nextId)
      lineRefs.current.get(nextId)?.focus()
    }

    // Emit cursor position
    socket.emit('cursor:move', {
      scriptId,
      lineId: id,
      offset: lineRefs.current.get(id)?.getOffset() ?? 0,
    })
  }

  // Listen for remote line updates
  useEffect(() => {
    socket.on('line:update', ({ lineId, type, text, authorId }: { lineId: string; type: ElementType; text: string; authorId: string }) => {
      if (authorId === userId) return
      setLines(prev => prev.map(l => l.id === lineId ? { ...l, type, text } : l))
    })
    return () => { socket.off('line:update') }
  }, [socket, userId])

  const changeActiveType = (type: ElementType) => {
    setLines(prev => prev.map(l => l.id === activeId ? { ...l, type } : l))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!readOnly && <Toolbar activeType={activeLine?.type ?? 'ACTION'} onChangeType={changeActiveType} />}

      <div style={{
        flex: 1, overflowY: 'auto', background: '#0f0f11',
        display: 'flex', justifyContent: 'center', padding: '2rem 0',
      }}>
        {/* Paper */}
        <div
          data-paper
          style={{
            background: '#fffef7', width: '8.5in', minHeight: '11in',
            padding: '1in 1in 1in 1.5in',
            boxShadow: '0 0 60px rgba(0,0,0,0.6)', position: 'relative',
          }}
        >
          {lines.map((line, i) => {
            const showPageBreak = i > 0 && i % LINES_PER_PAGE === 0
            const pageNum = Math.floor(i / LINES_PER_PAGE) + 1
            return (
              <div key={line.id}>
                {showPageBreak && <PageBreak pageNumber={pageNum} />}
                <EditorLine
                  ref={el => { if (el) lineRefs.current.set(line.id, el); else lineRefs.current.delete(line.id) }}
                  line={line}
                  isActive={line.id === activeId}
                  onChange={readOnly ? () => {} : updateLine}
                  onKeyDown={readOnly ? () => {} : handleKeyDown}
                  onClick={id => setActiveId(id)}
                />
              </div>
            )
          })}
        </div>
      </div>

      {autocomplete && !readOnly && (
        <Autocomplete
          suggestions={autocomplete.suggestions}
          query={autocomplete.query}
          position={autocomplete.position}
          onSelect={value => {
            setLines(prev => prev.map(l => l.id === activeId ? { ...l, text: value } : l))
            setAutocomplete(null)
          }}
          onDismiss={() => setAutocomplete(null)}
        />
      )}
    </div>
  )
}
