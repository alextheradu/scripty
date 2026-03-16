interface WordsChartProps {
  dailyStats: { date: string; words: number }[]
}

export function WordsChart({ dailyStats }: WordsChartProps) {
  const last30 = dailyStats.slice(-30)
  const max = Math.max(...last30.map(d => d.words), 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
      {last30.map(d => {
        const height = Math.max(2, (d.words / max) * 80)
        const label = new Date(d.date).toLocaleDateString([], { month: 'short', day: 'numeric' })
        return (
          <div key={d.date} title={`${label}: ${d.words} words`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{
              height, background: d.words > 0 ? '#e8b86d' : '#2a2a30',
              borderRadius: '2px 2px 0 0', minWidth: 4,
              opacity: d.words > 0 ? 0.7 + (d.words / max) * 0.3 : 1,
              transition: 'height 300ms ease',
            }} />
          </div>
        )
      })}
    </div>
  )
}
