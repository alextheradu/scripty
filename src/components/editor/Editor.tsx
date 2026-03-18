'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Avatar } from '@/components/shared/Avatar'
import { normalizeScriptLines, parseScriptContent, scriptLinesEqual } from '@/lib/editor/content'
import type { ScriptComment, ScriptLine, ElementType, SelectionRange, TextSegment } from '@/lib/editor/types'
import { ENTER_NEXT, DOUBLE_ENTER_NEXT, ELEMENT_CYCLE } from '@/lib/editor/types'
import { EditorLine, EditorLineHandle } from './EditorLine'
import { Toolbar } from './Toolbar'
import { Autocomplete } from './Autocomplete'
import { PageBreak } from './PageBreak'
import { getSocket } from '@/lib/socket'
import { CollaboratorCursor } from './CollaboratorCursor'
import { getEstimatedPageLayout, SCREENPLAY_PAGE_HEIGHT, SCREENPLAY_PAGE_PADDING, SCREENPLAY_PAGE_WIDTH } from '@/lib/screenplayLayout'

const GUTTER_WIDTH = 308
const THREAD_WIDTH = 280
const QUICK_REACTIONS = ['👍', '🎬', '👀'] as const

interface EditorProps {
  scriptId: string
  initialLines: ScriptLine[]
  userId: string
  readOnly?: boolean
  onLinesChange?: (lines: ScriptLine[]) => void
  onSaveStatusChange?: (status: 'saved' | 'saving' | 'unsaved') => void
  onRemoteCursorsChange?: (cursors: { userId: string; name: string; image?: string; color: string; lineId: string; offset: number }[]) => void
  jumpToUserId?: string | null
  onJumpHandled?: () => void
  onEdit?: () => void
}

interface LiveCursor {
  socketId: string
  lineId: string
  offset: number
  user: { id: string; name: string; image?: string; color: string }
}

interface LiveSelection {
  socketId: string
  range: SelectionRange
  user: { name: string; color: string }
}

interface OverlayRect {
  top: number
  left: number
  width: number
  height: number
}

export function Editor({ scriptId, initialLines, userId, readOnly, onLinesChange, onSaveStatusChange, onRemoteCursorsChange, jumpToUserId, onJumpHandled, onEdit }: EditorProps) {
  const [lines, setLines] = useState<ScriptLine[]>(
    initialLines.length ? normalizeScriptLines(initialLines) : [{ id: crypto.randomUUID(), type: 'ACTION', text: '' }]
  )
  const [activeId, setActiveId] = useState<string>(lines[0]?.id ?? '')
  const [autocomplete, setAutocomplete] = useState<{
    suggestions: string[]; query: string; position: { top: number; left: number }
  } | null>(null)
  const [lastEnterEmpty, setLastEnterEmpty] = useState<string | null>(null)
  const [remoteCursors, setRemoteCursors] = useState<Map<string, LiveCursor>>(new Map())
  const [remoteSelections, setRemoteSelections] = useState<Map<string, LiveSelection>>(new Map())
  const [localSelection, setLocalSelection] = useState<SelectionRange | null>(null)
  const [comments, setComments] = useState<ScriptComment[]>([])
  const [commentsOpen, setCommentsOpen] = useState(true)
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [draftAnchor, setDraftAnchor] = useState<SelectionRange | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [pendingReplies, setPendingReplies] = useState<Record<string, boolean>>({})
  const lineRefs = useRef<Map<string, EditorLineHandle>>(new Map())
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const selectionFrame = useRef<number>()
  const linesRef = useRef(lines)
  const pendingSaveRef = useRef(false)
  const socket = getSocket()
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const activeLine = lines.find(l => l.id === activeId)
  const locations = lines.filter(l => l.type === 'SCENE_HEADING').map(l => l.text).filter(Boolean)
  const characters = lines.filter(l => l.type === 'CHARACTER').map(l => l.text.toUpperCase()).filter(Boolean)
  const lineOrder = useMemo(() => new Map(lines.map((line, index) => [line.id, index])), [lines])
  const estimatedLayout = useMemo(() => getEstimatedPageLayout(lines), [lines])
  const breakBeforeLineIds = useMemo(() => new Set(estimatedLayout.breakBeforeLineIds), [estimatedLayout.breakBeforeLineIds])

  const scheduleSave = useCallback((nextLines: ScriptLine[]) => {
    clearTimeout(saveTimer.current)
    pendingSaveRef.current = true
    onSaveStatusChange?.('saving')
    saveTimer.current = setTimeout(() => {
      fetch(`/api/scripts/${scriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-timezone': timeZone },
        body: JSON.stringify({ content: nextLines }),
      })
        .then(response => {
          onSaveStatusChange?.(response.ok ? 'saved' : 'unsaved')
        })
        .catch(() => {
          onSaveStatusChange?.('unsaved')
        })
        .finally(() => {
        pendingSaveRef.current = false
      })
    }, 800)
  }, [onSaveStatusChange, scriptId, timeZone])

  const applyLinesUpdate = useCallback((
    updater: ScriptLine[] | ((current: ScriptLine[]) => ScriptLine[]),
    options?: {
      broadcast?: boolean
      persist?: boolean
      markEdited?: boolean
      syncAutocompleteId?: string
      syncAutocompleteText?: string
    }
  ) => {
    setLines(current => {
      const next = normalizeScriptLines(typeof updater === 'function' ? updater(current) : updater)
      if (scriptLinesEqual(current, next)) return current

      linesRef.current = next
      if (options?.markEdited) {
        onEdit?.()
        onSaveStatusChange?.('unsaved')
      }
      if (options?.syncAutocompleteId !== undefined && options.syncAutocompleteText !== undefined) {
        updateAutocomplete(options.syncAutocompleteId, options.syncAutocompleteText, next)
      }
      if (options?.broadcast && !readOnly) {
        socket.emit('script:content:update', { scriptId, lines: next, authorId: userId, updatedAt: Date.now() })
      }
      if (options?.persist) scheduleSave(next)
      return next
    })
  }, [onEdit, onSaveStatusChange, readOnly, scheduleSave, scriptId, socket, userId])

  useEffect(() => {
    linesRef.current = lines
    onLinesChange?.(lines)
  }, [lines, onLinesChange])

  useEffect(() => {
    const normalized: ScriptLine[] = initialLines.length ? normalizeScriptLines(initialLines) : [{ id: crypto.randomUUID(), type: 'ACTION', text: '' }]
    if (scriptLinesEqual(normalized, linesRef.current)) return
    setLines(normalized)
    linesRef.current = normalized
    setActiveId(current => normalized.some(line => line.id === current) ? current : (normalized[0]?.id ?? ''))
  }, [initialLines])

  useEffect(() => {
    fetch(`/api/scripts/${scriptId}/comments`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to load comments')
        setComments(data.comments ?? [])
      })
      .catch(() => {})
  }, [scriptId])

  function updateAutocomplete(id: string, text: string, currentLines: ScriptLine[]) {
    const line = currentLines.find(l => l.id === id)
    if (!line) return

    if (line.type === 'SCENE_HEADING') {
      const el = getLineElement(id)
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
      const el = getLineElement(id)
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

  const updateLine = useCallback((id: string, content: { text: string; segments: TextSegment[] }) => {
    if (readOnly) return
    applyLinesUpdate(
      prev => prev.map(line => line.id === id ? { ...line, text: content.text, segments: content.segments } : line),
      {
        broadcast: true,
        persist: true,
        markEdited: true,
        syncAutocompleteId: id,
        syncAutocompleteText: content.text,
      }
    )
  }, [applyLinesUpdate, readOnly])

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
        applyLinesUpdate(prev => prev.map(l => l.id === id ? { ...l, type: newType } : l), {
          broadcast: true,
          persist: true,
          markEdited: true,
        })
        setLastEnterEmpty(null)
        return
      }

      if (isEmpty && !isDoubleEnter) setLastEnterEmpty(id)
      else setLastEnterEmpty(null)

      const cursorOffset = lineRefs.current.get(id)?.getOffset() ?? 0
      const atLineStart = cursorOffset === 0 && line.text.length > 0

      const newId = crypto.randomUUID()
      const newType = ENTER_NEXT[line.type]
      const newLine: ScriptLine = { id: newId, type: newType, text: '' }

      if (atLineStart) {
        // Insert blank line above, keep focus on current line (which shifts down)
        applyLinesUpdate(prev => [...prev.slice(0, idx), newLine, ...prev.slice(idx)], {
          broadcast: true,
          persist: true,
          markEdited: true,
        })
        setTimeout(() => lineRefs.current.get(id)?.focus(0), 0)
      } else {
        applyLinesUpdate(prev => [...prev.slice(0, idx + 1), newLine, ...prev.slice(idx + 1)], {
          broadcast: true,
          persist: true,
          markEdited: true,
        })
        setActiveId(newId)
        setTimeout(() => lineRefs.current.get(newId)?.focus(), 0)
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      setAutocomplete(null)
      const dir = e.shiftKey ? -1 : 1
      const currentIdx = ELEMENT_CYCLE.indexOf(line.type)
      const nextType = ELEMENT_CYCLE[(currentIdx + dir + ELEMENT_CYCLE.length) % ELEMENT_CYCLE.length]
      applyLinesUpdate(prev => prev.map(l => l.id === id ? { ...l, type: nextType } : l), {
        broadcast: true,
        persist: true,
        markEdited: true,
      })
    }

    if (e.key === 'Backspace' && line.text === '' && lines.length > 1) {
      e.preventDefault()
      if (idx > 0) {
        const prevLine = lines[idx - 1]
        applyLinesUpdate(prev => prev.filter(l => l.id !== id), {
          broadcast: true,
          persist: true,
          markEdited: true,
        })
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
  }

  useEffect(() => {
    const handleContentUpdate = ({ lines: nextLines, authorId }: { lines: ScriptLine[]; authorId: string }) => {
      if (authorId === userId) return
      const normalized = normalizeScriptLines(nextLines)
      if (scriptLinesEqual(normalized, linesRef.current)) return
      setLines(normalized)
      linesRef.current = normalized
      setActiveId(current => normalized.some(line => line.id === current) ? current : (normalized[0]?.id ?? ''))
    }

    const handleCursorMove = (data: LiveCursor) => {
      setRemoteCursors(prev => new Map(prev).set(data.socketId, data))
    }

    const handleCursorClear = ({ socketId }: { socketId: string }) => {
      setRemoteCursors(prev => {
        const next = new Map(prev)
        next.delete(socketId)
        return next
      })
    }

    const handleSelectionUpdate = ({ socketId, selection, user }: { socketId: string; selection: SelectionRange | null; user: { name: string; color: string } }) => {
      setRemoteSelections(prev => {
        const next = new Map(prev)
        if (!selection) next.delete(socketId)
        else next.set(socketId, { socketId, range: selection, user })
        return next
      })
    }

    const handleCommentCreate = ({ comment }: { comment: ScriptComment }) => {
      setComments(prev => prev.some(existing => existing.id === comment.id) ? prev : [...prev, comment])
    }

    const handleCommentUpdate = ({ comment }: { comment: ScriptComment }) => {
      setComments(prev => prev.map(existing => existing.id === comment.id ? comment : existing))
    }

    socket.on('script:content:update', handleContentUpdate)
    socket.on('cursor:move', handleCursorMove)
    socket.on('cursor:clear', handleCursorClear)
    socket.on('selection:update', handleSelectionUpdate)
    socket.on('comment:create', handleCommentCreate)
    socket.on('comment:update', handleCommentUpdate)

    return () => {
      socket.off('script:content:update', handleContentUpdate)
      socket.off('cursor:move', handleCursorMove)
      socket.off('cursor:clear', handleCursorClear)
      socket.off('selection:update', handleSelectionUpdate)
      socket.off('comment:create', handleCommentCreate)
      socket.off('comment:update', handleCommentUpdate)
    }
  }, [socket, userId])

  useEffect(() => {
    let cancelled = false

    async function syncFromServer(force = false) {
      if (pendingSaveRef.current && !force) return

      try {
        const response = await fetch(`/api/scripts/${scriptId}`)
        const data = await response.json()
        if (!response.ok || cancelled) return

        const nextLines = parseScriptContent(data.script?.content)
        if (scriptLinesEqual(nextLines, linesRef.current)) return
        if (pendingSaveRef.current && !force) return

        setLines(nextLines)
        linesRef.current = nextLines
        setActiveId(current => nextLines.some(line => line.id === current) ? current : (nextLines[0]?.id ?? ''))
      } catch {
        // Ignore transient sync failures.
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncFromServer()
      }
    }

    const handleConnect = () => {
      void syncFromServer()
    }

    const interval = window.setInterval(() => {
      void syncFromServer()
    }, 5000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    socket.on('connect', handleConnect)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      socket.off('connect', handleConnect)
      clearTimeout(saveTimer.current)
    }
  }, [scriptId, socket])

  useEffect(() => {
    if (readOnly || typeof document === 'undefined') return

    const publishSelection = () => {
      cancelAnimationFrame(selectionFrame.current ?? 0)
      selectionFrame.current = requestAnimationFrame(() => {
        const selection = window.getSelection()
        const paperEl = getPaperElement()
        if (!selection || selection.rangeCount === 0 || !paperEl) {
          setLocalSelection(null)
          socket.emit('selection:update', { scriptId, selection: null })
          return
        }

        const anchorLineId = getNodeLineId(selection.anchorNode)
        const focusLineId = getNodeLineId(selection.focusNode)
        const anchorLineEl = anchorLineId ? getLineElement(anchorLineId) : null
        const focusLineEl = focusLineId ? getLineElement(focusLineId) : null

        if (!anchorLineId || !focusLineId || !anchorLineEl || !focusLineEl || !paperEl.contains(anchorLineEl) || !paperEl.contains(focusLineEl)) {
          setLocalSelection(null)
          socket.emit('selection:update', { scriptId, selection: null })
          return
        }

        const anchorOffset = getOffsetWithinLine(selection.anchorNode, selection.anchorOffset, anchorLineEl)
        const focusOffset = getOffsetWithinLine(selection.focusNode, selection.focusOffset, focusLineEl)
        const normalized = normalizeRange({
          startLineId: anchorLineId,
          endLineId: focusLineId,
          startOffset: anchorOffset,
          endOffset: focusOffset,
          text: selection.toString(),
        }, lineOrder)

        if (!normalized) return

        socket.emit('cursor:move', {
          scriptId,
          lineId: focusLineId,
          offset: focusOffset,
        })

        if (selection.isCollapsed || !normalized.text) {
          setLocalSelection(null)
          socket.emit('selection:update', { scriptId, selection: null })
          return
        }

        setLocalSelection(normalized)
        socket.emit('selection:update', { scriptId, selection: normalized })
      })
    }

    document.addEventListener('selectionchange', publishSelection)
    document.addEventListener('keyup', publishSelection)
    document.addEventListener('mouseup', publishSelection)
    document.addEventListener('focusin', publishSelection)
    return () => {
      cancelAnimationFrame(selectionFrame.current ?? 0)
      document.removeEventListener('selectionchange', publishSelection)
      document.removeEventListener('keyup', publishSelection)
      document.removeEventListener('mouseup', publishSelection)
      document.removeEventListener('focusin', publishSelection)
    }
  }, [lineOrder, readOnly, scriptId, socket])

  const changeActiveType = (type: ElementType) => {
    applyLinesUpdate(prev => prev.map(l => l.id === activeId ? { ...l, type } : l), {
      broadcast: true,
      persist: true,
      markEdited: true,
    })
  }

  const localSelectionRects = localSelection ? getRangeRects(localSelection, lines, lineOrder) : []
  const remoteSelectionOverlays = Array.from(remoteSelections.values()).flatMap(item =>
    getRangeRects(item.range, lines, lineOrder).map((rect, index) => ({
      key: `${item.socketId}-${index}`,
      rect,
      color: item.user.color,
    }))
  )
  const commentOverlays = comments
    .filter(comment => !comment.resolvedAt)
    .flatMap(comment =>
      getRangeRects(comment, lines, lineOrder).map((rect, index) => ({
        key: `${comment.id}-${index}`,
        rect,
        active: comment.id === activeCommentId,
      }))
    )
  const draftTop = draftAnchor ? getAnchorTop(draftAnchor, lines, lineOrder) : 24
  const selectionTop = localSelectionRects.length ? Math.min(...localSelectionRects.map(rect => rect.top)) : null

  async function handleCreateComment() {
    if (!draftAnchor || !commentDraft.trim()) return
    setCommenting(true)
    setCommentError(null)

    const res = await fetch(`/api/scripts/${scriptId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: commentDraft.trim(),
        quotedText: draftAnchor.text,
        startLineId: draftAnchor.startLineId,
        endLineId: draftAnchor.endLineId,
        startOffset: draftAnchor.startOffset,
        endOffset: draftAnchor.endOffset,
      }),
    })

    const data = await res.json()
    setCommenting(false)
    if (!res.ok) {
      setCommentError(data.error ?? 'Failed to add comment.')
      return
    }

    const newComment = data.comment as ScriptComment
    setComments(prev => prev.some(existing => existing.id === newComment.id) ? prev : [...prev, newComment])
    setActiveCommentId(newComment.id)
    setCommentDraft('')
    setDraftAnchor(null)
    setLocalSelection(null)
    setCommentsOpen(true)
    window.getSelection()?.removeAllRanges()
  }

  async function handleReply(commentId: string) {
    const body = replyDrafts[commentId]?.trim()
    if (!body) return
    setPendingReplies(prev => ({ ...prev, [commentId]: true }))

    const res = await fetch(`/api/scripts/${scriptId}/comments/${commentId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })

    const data = await res.json()
    setPendingReplies(prev => ({ ...prev, [commentId]: false }))
    if (!res.ok) {
      setCommentError(data.error ?? 'Failed to reply.')
      return
    }

    setComments(prev => prev.map(comment => comment.id === commentId ? data.comment : comment))
    setReplyDrafts(prev => ({ ...prev, [commentId]: '' }))
  }

  async function toggleReaction(commentId: string, emoji: string) {
    const res = await fetch(`/api/scripts/${scriptId}/comments/${commentId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
    const data = await res.json()
    if (!res.ok) {
      setCommentError(data.error ?? 'Failed to react.')
      return
    }
    setComments(prev => prev.map(comment => comment.id === commentId ? data.comment : comment))
  }

  async function toggleResolve(comment: ScriptComment) {
    const res = await fetch(`/api/scripts/${scriptId}/comments/${comment.id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: !comment.resolvedAt }),
    })
    const data = await res.json()
    if (!res.ok) {
      setCommentError(data.error ?? 'Failed to update comment.')
      return
    }
    setComments(prev => prev.map(existing => existing.id === comment.id ? data.comment : existing))
    if (data.comment.resolvedAt && activeCommentId === comment.id) setActiveCommentId(null)
  }

  function openDraftThread() {
    if (!localSelection) return
    setDraftAnchor(localSelection)
    setLocalSelection(null)
    setCommentDraft('')
    setCommentsOpen(true)
    setCommentError(null)
    window.getSelection()?.removeAllRanges()
  }

  function focusComment(comment: ScriptComment) {
    setCommentsOpen(true)
    setActiveCommentId(comment.id)
    setDraftAnchor(null)
    document.querySelector(`[data-line-id="${comment.startLineId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const remoteCursorOverlays = Array.from(remoteCursors.values()).map(cursor => {
    const point = getCaretPoint(cursor.lineId, cursor.offset)
    if (!point) return null
    return (
      <CollaboratorCursor
        key={cursor.socketId}
        name={cursor.user.name}
        color={cursor.user.color}
        top={point.top}
        left={point.left}
      />
    )
  })

  const commentCards = useMemo(() => {
    const unresolved = comments
      .filter(comment => !comment.resolvedAt)
      .map(comment => ({
        comment,
        top: getAnchorTop(comment, lines, lineOrder),
      }))
      .sort((a, b) => a.top - b.top)

    let cursorTop = 0
    return unresolved.map(item => {
      const estimatedHeight = 144 + item.comment.replies.length * 48
      const top = Math.max(item.top, cursorTop)
      cursorTop = top + estimatedHeight + 8
      return { ...item, top }
    })
  }, [comments, lines, lineOrder])

  useEffect(() => {
    if (!onRemoteCursorsChange) return

    const deduped = new Map<string, { userId: string; name: string; image?: string; color: string; lineId: string; offset: number }>()
    for (const cursor of remoteCursors.values()) {
      if (!cursor.user.id) continue
      deduped.set(cursor.user.id, {
        userId: cursor.user.id,
        name: cursor.user.name,
        image: cursor.user.image,
        color: cursor.user.color,
        lineId: cursor.lineId,
        offset: cursor.offset,
      })
    }

    onRemoteCursorsChange(Array.from(deduped.values()))
  }, [onRemoteCursorsChange, remoteCursors])

  useEffect(() => {
    if (!jumpToUserId) return

    const target = Array.from(remoteCursors.values()).find(cursor => cursor.user.id === jumpToUserId)
    if (target) {
      const lineEl = getLineElement(target.lineId)
      lineEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setActiveId(target.lineId)
    }

    onJumpHandled?.()
  }, [jumpToUserId, onJumpHandled, remoteCursors])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {!readOnly && (
          <Toolbar
            activeType={activeLine?.type ?? 'ACTION'}
            onChangeType={changeActiveType}
            commentsCount={comments.filter(comment => !comment.resolvedAt).length}
            commentsOpen={commentsOpen}
            onToggleComments={() => setCommentsOpen(open => !open)}
          />
        )}

        <div style={{
          flex: 1,
          overflow: 'auto',
          background: '#0f0f11',
          display: 'flex',
          justifyContent: 'center',
          padding: '1.15rem 1rem',
        }}>
          <div
            style={{
              position: 'relative',
              width: commentsOpen ? `calc(${SCREENPLAY_PAGE_WIDTH} + ${GUTTER_WIDTH}px)` : SCREENPLAY_PAGE_WIDTH,
              minWidth: commentsOpen ? `calc(${SCREENPLAY_PAGE_WIDTH} + ${GUTTER_WIDTH}px)` : SCREENPLAY_PAGE_WIDTH,
            }}
          >
            <div
              data-paper
              style={{
                background: '#fffef7',
                width: SCREENPLAY_PAGE_WIDTH,
                minHeight: SCREENPLAY_PAGE_HEIGHT,
                padding: SCREENPLAY_PAGE_PADDING,
                boxSizing: 'border-box',
                boxShadow: '0 0 60px rgba(0,0,0,0.6)',
                position: 'relative',
              }}
            >
              {commentOverlays.map(({ key, rect, active }) => (
                <div
                  key={key}
                  style={{
                    ...highlightRectStyle,
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    background: active ? 'rgba(232,184,109,0.34)' : 'rgba(232,184,109,0.14)',
                  }}
                />
              ))}

              {remoteSelectionOverlays.map(({ key, rect, color }) => (
                <div
                  key={key}
                  style={{
                    ...highlightRectStyle,
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    background: alphaColor(color, 0.24),
                  }}
                />
              ))}

              {lines.map((line, i) => {
                const showPageBreak = breakBeforeLineIds.has(line.id)
                const pageNum = estimatedLayout.pageNumberByLineId[line.id]
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
                      readOnly={readOnly}
                    />
                  </div>
                )
              })}

              {remoteCursorOverlays}
            </div>

            {commentsOpen && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: `calc(${SCREENPLAY_PAGE_WIDTH} + 18px)`,
                width: THREAD_WIDTH,
                minHeight: '100%',
              }}>
                {!readOnly && !draftAnchor && localSelection && selectionTop !== null && (
                  <button
                    onClick={openDraftThread}
                    style={{
                      ...commentIconStyle,
                      top: Math.max(selectionTop, 14),
                    }}
                    title="Comment on selection"
                  >
                    +
                  </button>
                )}

                {!readOnly && draftAnchor && (
                  <div style={{ ...threadCardStyle, top: draftTop, borderColor: '#52c0e0' }}>
                    <div style={threadHeaderStyle}>
                      <div>
                        <div style={threadTitleStyle}>New comment</div>
                        <div style={threadQuoteStyle}>{draftAnchor.text}</div>
                      </div>
                      <button
                        onClick={() => {
                          setDraftAnchor(null)
                          setCommentDraft('')
                          setCommentError(null)
                        }}
                        style={threadSmallBtnStyle}
                      >
                        Close
                      </button>
                    </div>

                    <textarea
                      value={commentDraft}
                      onChange={e => setCommentDraft(e.target.value)}
                      placeholder="Add your comment…"
                      style={threadTextareaStyle}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem' }}>
                      <button
                        onClick={() => {
                          setDraftAnchor(null)
                          setCommentDraft('')
                          setCommentError(null)
                        }}
                        style={threadSmallBtnStyle}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateComment}
                        disabled={commenting || !commentDraft.trim()}
                        style={threadPrimaryBtnStyle}
                      >
                        {commenting ? 'Saving…' : 'Comment'}
                      </button>
                    </div>
                  </div>
                )}

                {commentCards.map(({ comment, top }) => {
                  const authorName = comment.author.displayName ?? comment.author.name ?? comment.author.email ?? 'Unknown'
                  const authorImage = comment.author.profileImage ?? comment.author.image
                  const active = activeCommentId === comment.id
                  const reactionSummary = summarizeReactions(comment.reactions)

                  return (
                    <div
                      key={comment.id}
                      style={{
                        ...threadCardStyle,
                        top,
                        borderColor: active ? '#e8b86d' : '#2a2a30',
                        background: active ? '#1f1a14' : '#17171c',
                      }}
                      onClick={() => focusComment(comment)}
                    >
                      <div style={threadHeaderStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                          <Avatar src={authorImage} name={authorName} size={24} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ color: '#e8e6de', fontSize: '0.74rem', fontWeight: 700 }}>{authorName}</div>
                            <div style={{ color: '#6b6a64', fontSize: '0.62rem' }}>
                              {new Date(comment.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            toggleResolve(comment)
                          }}
                          style={{ ...resolveBtnStyle, color: comment.resolvedAt ? '#52e0b8' : '#8f8d86' }}
                          title={comment.resolvedAt ? 'Reopen comment' : 'Resolve comment'}
                        >
                          ✓
                        </button>
                      </div>

                      <div style={threadQuoteStyle}>{comment.quotedText}</div>
                      <div style={threadBodyStyle}>{comment.body}</div>

                      {comment.replies.length > 0 && (
                        <div style={{ marginTop: '0.45rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {comment.replies.map(reply => {
                            const replyName = reply.author.displayName ?? reply.author.name ?? reply.author.email ?? 'Unknown'
                            const replyImage = reply.author.profileImage ?? reply.author.image
                            return (
                              <div key={reply.id} style={replyRowStyle}>
                                <Avatar src={replyImage} name={replyName} size={18} />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ color: '#e8e6de', fontSize: '0.64rem', fontWeight: 600 }}>{replyName}</div>
                                  <div style={{ color: '#c6c3ba', fontSize: '0.67rem', lineHeight: 1.3 }}>{reply.body}</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
                        {QUICK_REACTIONS.map(emoji => {
                          const info = reactionSummary.find(item => item.emoji === emoji)
                          const activeReaction = !!comment.reactions.find(reaction => reaction.userId === userId && reaction.emoji === emoji)
                          return (
                            <button
                              key={emoji}
                              onClick={e => {
                                e.stopPropagation()
                                toggleReaction(comment.id, emoji)
                              }}
                              style={{
                                ...reactionBtnStyle,
                                borderColor: activeReaction ? '#e8b86d' : '#2a2a30',
                                color: activeReaction ? '#e8b86d' : '#8f8d86',
                              }}
                            >
                              {emoji}{info ? ` ${info.count}` : ''}
                            </button>
                          )
                        })}
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.45rem' }}>
                        <input
                          value={replyDrafts[comment.id] ?? ''}
                          onChange={e => setReplyDrafts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleReply(comment.id)
                            }
                          }}
                          placeholder="Reply"
                          style={replyInputStyle}
                        />
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleReply(comment.id)
                          }}
                          disabled={pendingReplies[comment.id] || !(replyDrafts[comment.id] ?? '').trim()}
                          style={threadPrimaryBtnStyle}
                        >
                          {pendingReplies[comment.id] ? '…' : '↵'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {autocomplete && !readOnly && (
          <Autocomplete
            suggestions={autocomplete.suggestions}
            query={autocomplete.query}
            position={autocomplete.position}
            onSelect={value => {
              applyLinesUpdate(prev => prev.map(l => l.id === activeId ? { ...l, text: value, segments: [{ text: value }] } : l), {
                broadcast: true,
                persist: true,
                markEdited: true,
                syncAutocompleteId: activeId,
                syncAutocompleteText: value,
              })
              setAutocomplete(null)
            }}
            onDismiss={() => setAutocomplete(null)}
          />
        )}

        {commentError && (
          <div style={{ color: '#e05252', fontSize: '0.74rem', padding: '0.38rem 0.85rem', background: '#141419' }}>
            {commentError}
          </div>
        )}
      </div>
    </div>
  )
}

function getPaperElement(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.querySelector('[data-paper]')
}

function getLineElement(lineId: string): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.querySelector(`[data-line-id="${lineId}"]`)
}

function getNodeLineId(node: Node | null): string | null {
  if (!node) return null
  const element = node instanceof HTMLElement ? node : node.parentElement
  return element?.closest('[data-line-id]')?.getAttribute('data-line-id') ?? null
}

function getOffsetWithinLine(node: Node | null, offset: number, lineEl: HTMLElement): number {
  const range = document.createRange()
  range.selectNodeContents(lineEl)
  try {
    range.setEnd(node ?? lineEl, offset)
    return range.toString().length
  } catch {
    return 0
  }
}

function normalizeRange(range: SelectionRange, lineOrder: Map<string, number>): SelectionRange | null {
  const startIndex = lineOrder.get(range.startLineId)
  const endIndex = lineOrder.get(range.endLineId)
  if (startIndex === undefined || endIndex === undefined) return null

  if (startIndex < endIndex || (startIndex === endIndex && range.startOffset <= range.endOffset)) {
    return range
  }

  return {
    startLineId: range.endLineId,
    endLineId: range.startLineId,
    startOffset: range.endOffset,
    endOffset: range.startOffset,
    text: range.text,
  }
}

function getCaretPoint(lineId: string, offset: number): { top: number; left: number } | null {
  const lineEl = getLineElement(lineId)
  const paperEl = getPaperElement()
  if (!lineEl || !paperEl) return null

  const range = document.createRange()
  const paperRect = paperEl.getBoundingClientRect()

  if (lineEl.firstChild?.nodeType === Node.TEXT_NODE) {
    const textNode = lineEl.firstChild as Text
    range.setStart(textNode, Math.min(offset, textNode.length))
    range.collapse(true)
  } else {
    range.selectNodeContents(lineEl)
    range.collapse(true)
  }

  const rect = range.getClientRects()[0] ?? lineEl.getBoundingClientRect()
  return {
    top: rect.top - paperRect.top,
    left: rect.left - paperRect.left,
  }
}

function getRangeRects(range: Pick<SelectionRange, 'startLineId' | 'endLineId' | 'startOffset' | 'endOffset'>, lines: ScriptLine[], lineOrder: Map<string, number>): OverlayRect[] {
  const startIndex = lineOrder.get(range.startLineId)
  const endIndex = lineOrder.get(range.endLineId)
  const paperEl = getPaperElement()
  if (startIndex === undefined || endIndex === undefined || !paperEl) return []

  const paperRect = paperEl.getBoundingClientRect()
  const rects: OverlayRect[] = []

  for (let index = startIndex; index <= endIndex; index += 1) {
    const line = lines[index]
    const lineEl = getLineElement(line.id)
    if (!lineEl || lineEl.firstChild?.nodeType !== Node.TEXT_NODE) continue

    const textNode = lineEl.firstChild as Text
    const textLength = textNode.length
    const startOffset = index === startIndex ? range.startOffset : 0
    const endOffset = index === endIndex ? range.endOffset : textLength
    if (startOffset === endOffset) continue

    const domRange = document.createRange()
    domRange.setStart(textNode, Math.min(startOffset, textLength))
    domRange.setEnd(textNode, Math.min(endOffset, textLength))

    for (const clientRect of Array.from(domRange.getClientRects())) {
      rects.push({
        top: clientRect.top - paperRect.top,
        left: clientRect.left - paperRect.left,
        width: clientRect.width,
        height: clientRect.height,
      })
    }
  }

  return rects
}

function getAnchorTop(range: Pick<SelectionRange, 'startLineId' | 'endLineId' | 'startOffset' | 'endOffset'>, lines: ScriptLine[], lineOrder: Map<string, number>): number {
  const rects = getRangeRects(range, lines, lineOrder)
  if (rects.length === 0) return 24
  return Math.min(...rects.map(rect => rect.top))
}

function alphaColor(color: string, alpha: number): string {
  if (!color.startsWith('#') || (color.length !== 7 && color.length !== 4)) return color
  const hex = color.length === 4
    ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
    : color
  const red = parseInt(hex.slice(1, 3), 16)
  const green = parseInt(hex.slice(3, 5), 16)
  const blue = parseInt(hex.slice(5, 7), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function summarizeReactions(reactions: ScriptComment['reactions']) {
  const counts = new Map<string, number>()
  for (const reaction of reactions) {
    counts.set(reaction.emoji, (counts.get(reaction.emoji) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([emoji, count]) => ({ emoji, count }))
}

const highlightRectStyle: React.CSSProperties = {
  position: 'absolute',
  borderRadius: 3,
  pointerEvents: 'none',
  zIndex: 6,
}

const threadCardStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  width: THREAD_WIDTH,
  background: '#17171c',
  border: '1px solid #2a2a30',
  borderRadius: 12,
  padding: '0.62rem',
  boxShadow: '0 14px 28px rgba(0,0,0,0.2)',
  zIndex: 14,
}

const threadHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '0.4rem',
  alignItems: 'flex-start',
  marginBottom: '0.42rem',
}

const threadTitleStyle: React.CSSProperties = {
  color: '#e8e6de',
  fontSize: '0.76rem',
  fontWeight: 700,
}

const threadQuoteStyle: React.CSSProperties = {
  color: '#e8b86d',
  fontSize: '0.64rem',
  lineHeight: 1.28,
  marginBottom: '0.32rem',
}

const threadBodyStyle: React.CSSProperties = {
  color: '#e8e6de',
  fontSize: '0.71rem',
  lineHeight: 1.35,
}

const threadSmallBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #2a2a30',
  borderRadius: 999,
  padding: '0.16rem 0.46rem',
  color: '#8f8d86',
  fontSize: '0.62rem',
  cursor: 'pointer',
  flexShrink: 0,
}

const threadPrimaryBtnStyle: React.CSSProperties = {
  background: '#e8b86d',
  border: 'none',
  borderRadius: 999,
  padding: '0.22rem 0.52rem',
  color: '#0f0f11',
  fontSize: '0.64rem',
  cursor: 'pointer',
  fontWeight: 700,
  flexShrink: 0,
}

const threadTextareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 76,
  resize: 'vertical',
  background: '#0f0f11',
  border: '1px solid #2a2a30',
  borderRadius: 9,
  color: '#e8e6de',
  padding: '0.5rem 0.62rem',
  fontSize: '0.71rem',
  outline: 'none',
  fontFamily: 'Syne, sans-serif',
  marginBottom: '0.55rem',
}

const commentIconStyle: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  width: 24,
  height: 24,
  borderRadius: 999,
  border: '1px solid #e8b86d',
  background: '#17171c',
  color: '#e8b86d',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer',
  zIndex: 15,
}

const resolveBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #2a2a30',
  borderRadius: 999,
  width: 22,
  height: 22,
  cursor: 'pointer',
  fontWeight: 700,
  flexShrink: 0,
}

const replyRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.35rem',
}

const reactionBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #2a2a30',
  borderRadius: 999,
  padding: '0.12rem 0.34rem',
  fontSize: '0.64rem',
  cursor: 'pointer',
}

const replyInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: '#0f0f11',
  border: '1px solid #2a2a30',
  borderRadius: 999,
  padding: '0.26rem 0.5rem',
  color: '#e8e6de',
  fontSize: '0.66rem',
  outline: 'none',
}
