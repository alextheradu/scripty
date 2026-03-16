'use client'
import type { ElementType } from '@/lib/editor/types'
import { ELEMENT_LABELS } from '@/lib/editor/lineStyles'
import { ELEMENT_CYCLE } from '@/lib/editor/types'

interface ToolbarProps {
  activeType: ElementType
  onChangeType: (type: ElementType) => void
}

export function Toolbar({ activeType, onChangeType }: ToolbarProps) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: '#1a1a1f', borderBottom: '1px solid #2a2a30',
      padding: '0 1rem', display: 'flex', gap: '0.25rem',
      alignItems: 'center', height: 40,
    }}>
      {ELEMENT_CYCLE.map(type => {
        const isActive = type === activeType
        return (
          <button
            key={type}
            title={`${ELEMENT_LABELS[type]} (Tab to cycle)`}
            onClick={() => onChangeType(type)}
            style={{
              background: isActive ? '#e8b86d22' : 'none',
              border: `1px solid ${isActive ? '#e8b86d' : 'transparent'}`,
              borderRadius: 4, padding: '0.2rem 0.625rem',
              color: isActive ? '#e8b86d' : '#6b6a64',
              fontFamily: 'Syne, sans-serif', fontSize: '0.75rem',
              cursor: 'pointer', transition: 'all 150ms', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.color = '#e8e6de'
                ;(e.currentTarget as HTMLElement).style.borderColor = '#2a2a30'
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.color = '#6b6a64'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'transparent'
              }
            }}
          >
            {ELEMENT_LABELS[type]}
          </button>
        )
      })}
    </div>
  )
}
