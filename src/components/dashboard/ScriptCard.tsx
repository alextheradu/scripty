'use client'
import Link from 'next/link'
import { Avatar } from '@/components/shared/Avatar'

interface ScriptCardProps {
  id: string; title: string; updatedAt: string; pageCount: number; wordCount: number
  collaborators: { name: string; image?: string }[]
  isOwner: boolean; onDelete?: (id: string) => void
}

export function ScriptCard({ id, title, updatedAt, pageCount, wordCount, collaborators, isOwner, onDelete }: ScriptCardProps) {
  const updated = new Date(updatedAt)
  const diff = Date.now() - updated.getTime()
  const mins = Math.floor(diff / 60000)
  const relTime = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins/60)}h ago` : `${Math.floor(mins/1440)}d ago`

  return (
    <div
      style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 8, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', transition: 'border-color 200ms ease, transform 200ms ease' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e8b86d'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a30'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
    >
      <Link href={`/script/${id}`} style={{ textDecoration: 'none', flexGrow: 1 }}>
        <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.125rem', color: '#e8e6de', margin: 0, marginBottom: '0.25rem' }}>{title}</h3>
        <p style={{ fontSize: '0.75rem', color: '#6b6a64', margin: 0 }}>{relTime} · {pageCount}p · {wordCount.toLocaleString()} words</p>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex' }}>
          {collaborators.slice(0, 4).map((c, i) => (
            <div key={i} style={{ marginLeft: i > 0 ? -8 : 0 }}><Avatar src={c.image} name={c.name ?? '?'} size={24} /></div>
          ))}
        </div>
        {isOwner && (
          <button onClick={e => { e.preventDefault(); onDelete?.(id) }}
            style={{ background: 'none', border: 'none', color: '#6b6a64', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 6px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e05252')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b6a64')}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
