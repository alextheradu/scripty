'use client'

import { Avatar } from '@/components/shared/Avatar'
import type { ScriptComment } from '@/lib/editor/types'

interface CommentsPanelProps {
  open: boolean
  comments: ScriptComment[]
  activeCommentId: string | null
  onClose: () => void
  onSelect: (comment: ScriptComment) => void
}

export function CommentsPanel({ open, comments, activeCommentId, onClose, onSelect }: CommentsPanelProps) {
  return (
    <aside style={{
      width: open ? 320 : 0,
      overflow: 'hidden',
      transition: 'width 200ms ease',
      borderLeft: open ? '1px solid #2a2a30' : 'none',
      background: '#17171c',
      flexShrink: 0,
    }}>
      <div style={{ width: 320, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.9rem 1rem',
          borderBottom: '1px solid #2a2a30',
        }}>
          <div>
            <div style={{ color: '#e8e6de', fontWeight: 700, fontSize: '0.9rem' }}>Comments</div>
            <div style={{ color: '#6b6a64', fontSize: '0.72rem' }}>{comments.length} total</div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>Close</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem' }}>
          {comments.length === 0 ? (
            <div style={emptyStyle}>Select text in the script and add a comment.</div>
          ) : (
            comments.map(comment => {
              const name = comment.author.displayName ?? comment.author.name ?? comment.author.email ?? 'Unknown'
              const image = comment.author.profileImage ?? comment.author.image
              const active = comment.id === activeCommentId

              return (
                <button
                  key={comment.id}
                  onClick={() => onSelect(comment)}
                  style={{
                    ...itemStyle,
                    borderColor: active ? '#e8b86d' : '#2a2a30',
                    background: active ? '#1f1a14' : '#1a1a1f',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.7rem' }}>
                    <Avatar src={image} name={name} size={30} />
                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                      <div style={{ color: '#e8e6de', fontSize: '0.8rem', fontWeight: 600 }}>{name}</div>
                      <div style={{ color: '#6b6a64', fontSize: '0.68rem' }}>
                        {new Date(comment.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div style={quoteStyle}>{comment.quotedText}</div>
                  <div style={{ color: '#e8e6de', fontSize: '0.78rem', lineHeight: 1.45, textAlign: 'left' }}>
                    {comment.body}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </aside>
  )
}

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #2a2a30',
  borderRadius: 999,
  padding: '0.35rem 0.7rem',
  color: '#e8e6de',
  fontSize: '0.72rem',
  cursor: 'pointer',
}

const emptyStyle: React.CSSProperties = {
  border: '1px dashed #2a2a30',
  borderRadius: 10,
  padding: '1rem',
  color: '#6b6a64',
  fontSize: '0.78rem',
  lineHeight: 1.5,
}

const itemStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #2a2a30',
  borderRadius: 12,
  padding: '0.85rem',
  marginBottom: '0.75rem',
  cursor: 'pointer',
}

const quoteStyle: React.CSSProperties = {
  color: '#e8b86d',
  fontSize: '0.72rem',
  lineHeight: 1.4,
  marginBottom: '0.55rem',
  textAlign: 'left',
}
