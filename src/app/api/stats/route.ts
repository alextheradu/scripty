import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stats = await prisma.writingStats.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'asc' },
  })

  // Streak calculation
  const sortedDates = stats.map(s => s.date).sort()
  let streak = 0, longestStreak = 0, currentStreak = 0
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const dateSet = new Set(sortedDates.filter((_, i) => stats[i].words > 0))
  let check: string | null = dateSet.has(today) ? today : (dateSet.has(yesterday) ? yesterday : null)
  while (check && dateSet.has(check)) {
    currentStreak++
    const prev = new Date(new Date(check).getTime() - 86400000).toISOString().slice(0, 10)
    check = prev
  }
  longestStreak = stats.reduce((max, s, i) => {
    if (s.words > 0) {
      if (i === 0 || stats[i - 1].words === 0) streak = 1
      else streak++
      return Math.max(max, streak)
    }
    return max
  }, 0)

  const scripts = await prisma.script.findMany({
    where: { ownerId: session.user.id },
    select: { id: true, title: true, content: true },
  })

  const scriptStats = scripts.map(s => {
    const lines = JSON.parse(s.content || '[]')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const words = lines.reduce((acc: number, l: any) => acc + (l.text?.split(/\s+/).filter(Boolean).length ?? 0), 0)
    const pages = Math.max(1, Math.ceil(lines.length / 55))
    return { id: s.id, title: s.title, words, pages }
  })

  const totalWords = stats.reduce((acc, s) => acc + s.words, 0)
  const todayWords = stats.find(s => s.date === today)?.words ?? 0
  const totalPages = scriptStats.reduce((acc, s) => acc + s.pages, 0)

  const hourCounts: number[] = new Array(24).fill(0)

  return NextResponse.json({
    currentStreak,
    longestStreak,
    totalWords,
    todayWords,
    totalPages,
    scriptStats,
    dailyStats: stats.map(s => ({ date: s.date, words: s.words })),
    hourCounts,
  })
}
