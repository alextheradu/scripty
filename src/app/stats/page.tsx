'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppNav } from '@/components/shared/AppNav'
import { ContributionGraph } from '@/components/stats/ContributionGraph'
import { WordsChart } from '@/components/stats/WordsChart'

export default function StatsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null)
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  useEffect(() => {
    fetch('/api/stats', { headers: { 'x-timezone': timeZone } }).then(r => r.json()).then(setData)
  }, [timeZone])

  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#0f0f11', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6a64', fontFamily: 'Syne, sans-serif' }}>
      Loading…
    </div>
  )

  const statCard = (label: string, value: string | number) => (
    <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 8, padding: '1rem', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: '0.6875rem', color: '#6b6a64', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontFamily: 'Syne, sans-serif' }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontFamily: '"Playfair Display", serif', color: '#e8b86d', fontWeight: 700 }}>{value}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f11', color: '#e8e6de' }}>
      <AppNav />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', marginBottom: '1.5rem' }}>Writing Stats</h1>

        {/* Summary cards */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {statCard('Current Streak', `🔥 ${data.currentStreak}d`)}
          {statCard('Longest Streak', `${data.longestStreak}d`)}
          {statCard('Total Words', data.totalWords.toLocaleString())}
          {statCard('Today', data.todayWords.toLocaleString())}
          {statCard('Total Pages', data.totalPages)}
        </div>

        {/* Contribution graph */}
        <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: '#e8e6de' }}>Last 90 Days</h2>
          <ContributionGraph dailyStats={data.dailyStats} />
        </div>

        {/* Words per day chart */}
        <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: '#e8e6de' }}>Words Per Day (last 30)</h2>
          <WordsChart dailyStats={data.dailyStats} />
        </div>

        {/* Per-script table */}
        <div style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 8, padding: '1.25rem' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: '#e8e6de' }}>By Script</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Syne, sans-serif', fontSize: '0.8125rem' }}>
            <thead>
              <tr>
                {['Script', 'Words', 'Pages'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.4rem 0.5rem', color: '#6b6a64', borderBottom: '1px solid #2a2a30', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.scriptStats.map((s: any) => (
                <tr key={s.id}>
                  <td style={{ padding: '0.4rem 0.5rem' }}>
                    <Link href={`/script/${s.id}`} style={{ color: '#e8b86d', textDecoration: 'none' }}>{s.title}</Link>
                  </td>
                  <td style={{ padding: '0.4rem 0.5rem', color: '#e8e6de' }}>{s.words.toLocaleString()}</td>
                  <td style={{ padding: '0.4rem 0.5rem', color: '#e8e6de' }}>{s.pages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
