interface ContributionGraphProps {
  dailyStats: { date: string; words: number }[]
}

function getLevel(words: number): number {
  if (words === 0) return 0
  if (words <= 200) return 1
  if (words <= 500) return 2
  return 3
}

const LEVEL_COLORS = ['#1a1a1f', '#e8b86d33', '#e8b86d88', '#e8b86d']

export function ContributionGraph({ dailyStats }: ContributionGraphProps) {
  const statMap = new Map(dailyStats.map(s => [s.date, s.words]))

  // Build 13 weeks × 7 days grid ending today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days: { date: string; words: number }[] = []
  for (let i = 90; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
    const date = d.toISOString().slice(0, 10)
    days.push({ date, words: statMap.get(date) ?? 0 })
  }

  // Pad to full weeks
  const startDow = new Date(days[0].date).getDay()
  const padded = [...Array(startDow).fill(null), ...days]
  const weeks: (typeof days[0] | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))

  return (
    <div>
      <div style={{ display: 'flex', gap: 3 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {week.map((day, di) => (
              <div
                key={di}
                title={day ? `${day.date}: ${day.words} words` : ''}
                style={{
                  width: 12, height: 12, borderRadius: 2,
                  background: day ? LEVEL_COLORS[getLevel(day.words)] : 'transparent',
                  border: day ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.625rem', color: '#6b6a64', fontFamily: 'Syne, sans-serif' }}>
        <span>Less</span>
        {LEVEL_COLORS.map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c, border: '1px solid rgba(255,255,255,0.05)' }} />)}
        <span>More</span>
      </div>
    </div>
  )
}
