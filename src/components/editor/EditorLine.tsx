'use client'
import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { getLineHtml, getLineSegments, normalizeSegments } from '@/lib/editor/content'
import type { ScriptLine, TextSegment } from '@/lib/editor/types'
import { LINE_STYLES } from '@/lib/editor/lineStyles'
import { SCREENPLAY_FONT_SIZE, SCREENPLAY_LINE_HEIGHT } from '@/lib/screenplayLayout'

interface EditorLineProps {
  line: ScriptLine
  isActive: boolean
  collaboratorCursors?: { color: string; name: string; offset: number }[]
  onChange: (id: string, content: { text: string; segments: TextSegment[] }) => void
  onKeyDown: (e: React.KeyboardEvent, id: string) => void
  onClick: (id: string) => void
  readOnly?: boolean
}

export interface EditorLineHandle {
  focus: (offset?: number) => void
  getOffset: () => number
}

export const EditorLine = forwardRef<EditorLineHandle, EditorLineProps>(
  ({ line, isActive, onChange, onKeyDown, onClick, readOnly }, ref) => {
    const divRef = useRef<HTMLDivElement>(null)
    const styles = LINE_STYLES[line.type]

    useImperativeHandle(ref, () => ({
      focus(offset?: number) {
        const el = divRef.current
        if (!el) return
        el.focus()
        if (offset !== undefined) {
          setCaretOffset(el, offset)
        } else {
          const range = document.createRange()
          const sel = window.getSelection()
          range.selectNodeContents(el)
          range.collapse(false)
          sel?.removeAllRanges()
          sel?.addRange(range)
        }
      },
      getOffset() {
        const el = divRef.current
        if (!el) return 0
        return getCaretOffset(el)
      },
    }))

    useEffect(() => {
      const el = divRef.current
      if (!el) return

      const desiredSegments = getLineSegments(line)
      const currentSegments = readSegmentsFromElement(el)
      if (segmentsEqual(currentSegments, desiredSegments)) return

      const isFocused = document.activeElement === el
      const offset = isFocused ? getCaretOffset(el) : 0
      el.innerHTML = getLineHtml(line)
      if (isFocused) setCaretOffset(el, offset)
    }, [line])

    function handleInput() {
      const el = divRef.current
      if (!el) return
      const segments = readSegmentsFromElement(el)
      onChange(line.id, { text: segments.map(segment => segment.text).join(''), segments })
    }

    function handleEditorKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
      if (!readOnly && (e.metaKey || e.ctrlKey) && !e.altKey) {
        const key = e.key.toLowerCase()
        const command = key === 'b' ? 'bold' : key === 'i' ? 'italic' : key === 'u' ? 'underline' : null
        if (command) {
          e.preventDefault()
          document.execCommand(command)
          handleInput()
          return
        }
      }

      onKeyDown(e, line.id)
    }

    return (
      <div
        ref={divRef}
        contentEditable={readOnly ? false : true}
        suppressContentEditableWarning
        data-line-id={line.id}
        data-element-type={line.type}
        onInput={handleInput}
        onKeyDown={handleEditorKeyDown}
        onClick={() => onClick(line.id)}
        style={{
          fontFamily: '"Courier Prime", monospace',
          fontSize: SCREENPLAY_FONT_SIZE,
          lineHeight: SCREENPLAY_LINE_HEIGHT,
          minHeight: '1em',
          outline: 'none',
          padding: '0 0.25rem',
          borderLeft: isActive ? '2px solid #e8b86d' : '2px solid transparent',
          transition: 'border-color 150ms',
          fontWeight: styles.fontWeight ?? '400',
          textTransform: styles.textTransform ?? 'none',
          fontStyle: styles.fontStyle ?? 'normal',
          marginLeft: styles.marginLeft ?? '0',
          marginRight: styles.marginRight ?? '0',
          textAlign: styles.textAlign ?? 'left',
          color: styles.color ?? '#1a1a1a',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          position: 'relative',
          cursor: readOnly ? 'default' : 'text',
          boxSizing: 'border-box',
        }}
      />
    )
  }
)

EditorLine.displayName = 'EditorLine'

function segmentsEqual(a: TextSegment[], b: TextSegment[]) {
  if (a.length !== b.length) return false
  for (let index = 0; index < a.length; index += 1) {
    if (
      a[index].text !== b[index].text
      || !!a[index].bold !== !!b[index].bold
      || !!a[index].italic !== !!b[index].italic
      || !!a[index].underline !== !!b[index].underline
    ) {
      return false
    }
  }

  return true
}

function readSegmentsFromElement(element: HTMLElement): TextSegment[] {
  const segments: TextSegment[] = []
  collectSegments(element, {}, segments)
  return normalizeSegments(segments, element.textContent ?? '')
}

function collectSegments(node: Node, marks: Omit<TextSegment, 'text'>, output: TextSegment[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    if (text) output.push({ text, ...marks })
    return
  }

  if (!(node instanceof HTMLElement)) return

  const nextMarks = {
    ...marks,
    ...(isBoldNode(node) ? { bold: true } : {}),
    ...(isItalicNode(node) ? { italic: true } : {}),
    ...(isUnderlineNode(node) ? { underline: true } : {}),
  }

  for (const child of Array.from(node.childNodes)) {
    collectSegments(child, nextMarks, output)
  }
}

function isBoldNode(node: HTMLElement) {
  const tag = node.tagName
  if (tag === 'B' || tag === 'STRONG') return true
  const fontWeight = node.style.fontWeight
  if (!fontWeight) return false
  if (fontWeight === 'bold' || fontWeight === 'bolder') return true
  const numericWeight = Number(fontWeight)
  return !Number.isNaN(numericWeight) && numericWeight >= 600
}

function isItalicNode(node: HTMLElement) {
  return node.tagName === 'I' || node.tagName === 'EM' || node.style.fontStyle === 'italic'
}

function isUnderlineNode(node: HTMLElement) {
  return node.tagName === 'U' || node.style.textDecoration.includes('underline') || node.style.textDecorationLine.includes('underline')
}

function getCaretOffset(element: HTMLElement): number {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return 0

  const range = selection.getRangeAt(0).cloneRange()
  range.selectNodeContents(element)
  range.setEnd(selection.anchorNode ?? element, selection.anchorOffset)
  return range.toString().length
}

function setCaretOffset(element: HTMLElement, offset: number) {
  const selection = window.getSelection()
  if (!selection) return

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  let remaining = Math.max(offset, 0)
  let textNode = walker.nextNode() as Text | null

  while (textNode) {
    if (remaining <= textNode.length) {
      const range = document.createRange()
      range.setStart(textNode, remaining)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }

    remaining -= textNode.length
    textNode = walker.nextNode() as Text | null
  }

  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}
