import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Editor } from '@/components/editor/Editor'

export default async function SharedScriptPage({ params }: { params: { token: string } }) {
  const script = await prisma.script.findUnique({
    where: { shareToken: params.token },
  })
  if (!script || !script.publicAccess) notFound()

  const lines = JSON.parse(script.content || '[]')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f11' }}>
      <header style={{ height: 44, background: '#1a1a1f', borderBottom: '1px solid #2a2a30', display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: '0.75rem' }}>
        <span style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.125rem', color: '#e8b86d' }}>Scripty</span>
        <span style={{ color: '#2a2a30' }}>›</span>
        <span style={{ fontFamily: '"Playfair Display", serif', fontSize: '0.9375rem', color: '#e8e6de' }}>{script.title}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6b6a64', fontFamily: 'Syne, sans-serif', background: '#2a2a30', padding: '2px 8px', borderRadius: 20 }}>Read-only</span>
      </header>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Editor scriptId={script.id} initialLines={lines} userId="public" readOnly />
      </div>
    </div>
  )
}
