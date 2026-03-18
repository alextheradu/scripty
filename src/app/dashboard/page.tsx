'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ScriptCard } from '@/components/dashboard/ScriptCard'
import { AppNav } from '@/components/shared/AppNav'
import { ProfileSetupModal } from '@/components/shared/ProfileSetupModal'

type ScriptSummary = {
  id: string; title: string; updatedAt: string; createdAt: string; pageCount: number; wordCount: number
  collaborators: { name: string; image?: string }[]
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [owned, setOwned] = useState<ScriptSummary[]>([])
  const [collaborating, setCollaborating] = useState<ScriptSummary[]>([])
  const [tab, setTab] = useState<'mine' | 'shared'>('mine')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showProfileSetup, setShowProfileSetup] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/api/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    // Show profile setup modal if no displayName set yet
    if (!session?.user?.displayName) setShowProfileSetup(true)
    fetch('/api/scripts').then(r => r.json()).then(d => {
      setOwned(d.owned ?? [])
      setCollaborating(d.collaborating ?? [])
      setLoading(false)
    })
  }, [status])

  async function handleCreate() {
    setCreating(true)
    const res = await fetch('/api/scripts', { method: 'POST' })
    const { id } = await res.json()
    router.push(`/script/${id}`)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this script permanently?')) return
    await fetch(`/api/scripts/${id}`, { method: 'DELETE' })
    setOwned(prev => prev.filter(s => s.id !== id))
  }

  if (status === 'loading' || loading) return (
    <div style={{ minHeight: '100vh', background: '#0f0f11', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6a64', fontFamily: 'Syne, sans-serif' }}>
      Loading…
    </div>
  )

  const list = (tab === 'mine' ? owned : collaborating)
    .filter(s => s.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : new Date(b[sort]).getTime() - new Date(a[sort]).getTime())

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f11', color: '#e8e6de' }}>
      {showProfileSetup && <ProfileSetupModal onComplete={() => setShowProfileSetup(false)} />}
      <AppNav
        actions={
          <button onClick={handleCreate} disabled={creating} style={primaryActionStyle}>
            {creating ? 'Creating…' : '+ New Script'}
          </button>
        }
      />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', margin: 0 }}>Your workspace</h1>
          <p style={{ color: '#6b6a64', fontSize: '0.92rem', margin: '0.4rem 0 0' }}>
            Jump between scripts, shared work, stats, and account settings from one consistent nav.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search scripts…"
            style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 6, padding: '0.5rem 0.75rem', color: '#e8e6de', fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', outline: 'none', width: 220 }} />
          <select value={sort} onChange={e => setSort(e.target.value as 'updatedAt' | 'createdAt' | 'title')}
            style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 6, padding: '0.5rem 0.75rem', color: '#e8e6de', fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', outline: 'none' }}>
            <option value="updatedAt">Last edited</option>
            <option value="createdAt">Date created</option>
            <option value="title">Title</option>
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
            {(['mine', 'shared'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? '#e8b86d22' : 'none', border: `1px solid ${tab === t ? '#e8b86d' : '#2a2a30'}`, borderRadius: 6, padding: '0.4rem 0.875rem', color: tab === t ? '#e8b86d' : '#6b6a64', fontFamily: 'Syne, sans-serif', fontSize: '0.8125rem', cursor: 'pointer' }}>
                {t === 'mine' ? 'My Scripts' : 'Shared with me'}
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b6a64', marginTop: '4rem' }}>
            <p style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.5rem', marginBottom: '0.5rem' }}>{search ? 'No matching scripts.' : 'No scripts yet.'}</p>
            {!search && <p style={{ fontSize: '0.875rem' }}>Click &quot;+ New Script&quot; to get started.</p>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {list.map(s => <ScriptCard key={s.id} {...s} isOwner={tab === 'mine'} onDelete={handleDelete} />)}
          </div>
        )}
      </main>
    </div>
  )
}

const primaryActionStyle: React.CSSProperties = {
  background: '#e8b86d',
  color: '#0f0f11',
  border: 'none',
  borderRadius: 999,
  padding: '0.55rem 1rem',
  fontFamily: 'Syne, sans-serif',
  fontWeight: 700,
  fontSize: '0.82rem',
  cursor: 'pointer',
}
