'use client'
import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import type { ScriptLine } from '@/lib/editor/types'
import { LINE_STYLES } from '@/lib/editor/lineStyles'

interface EditorLineProps {
  line: ScriptLine
  isActive: boolean
  collaboratorCursors?: { color: string; name: string; offset: number }[]
  onChange: (id: string, text: string) => void
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
          const range = document.createRange()
          const sel = window.getSelection()
          const text = el.firstChild
          if (text) {
            range.setStart(text, Math.min(offset, (text as Text).length))
            range.collapse(true)
            sel?.removeAllRanges()
            sel?.addRange(range)
          }
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
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) return 0
        return sel.getRangeAt(0).startOffset
      },
    }))

    useEffect(() => {
      const el = divRef.current
      if (!el) return
      if (el.textContent !== line.text) {
        const sel = window.getSelection()
        const offset = sel?.rangeCount ? sel.getRangeAt(0).startOffset : 0
        el.textContent = line.text
        if (document.activeElement === el && el.firstChild) {
          const range = document.createRange()
          range.setStart(el.firstChild, Math.min(offset, (el.firstChild as Text).length))
          range.collapse(true)
          sel?.removeAllRanges()
          sel?.addRange(range)
        }
      }
    }, [line.text])

    function handleInput() {
      const el = divRef.current
      if (!el) return
      const text = el.textContent ?? ''
      onChange(line.id, text)
    }

    return (
      <div
        ref={divRef}
        contentEditable={readOnly ? false : true}
        suppressContentEditableWarning
        data-line-id={line.id}
        data-element-type={line.type}
        onInput={handleInput}
        onKeyDown={e => onKeyDown(e, line.id)}
        onClick={() => onClick(line.id)}
        style={{
          fontFamily: '"Courier Prime", monospace',
          fontSize: '12pt',
          lineHeight: '1.5',
          minHeight: '1.5em',
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
        }}
      />
    )
  }
)

EditorLine.displayName = 'EditorLine'
