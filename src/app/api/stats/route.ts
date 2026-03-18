import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { addDays, diffDays, getDateKey } from '@/lib/dates'
import { parseScriptContent } from '@/lib/editor/content'
import { getEstimatedPageLayout } from '@/lib/screenplayLayout'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stats = await prisma.writingStats.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'asc' },
  })

  const revisions = await prisma.revision.findMany({
    where: { authorId: session.user.id },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  })

  let longestStreak = 0, currentStreak = 0
  const timeZone = req.headers.get('x-timezone') ?? undefined
  const today = getDateKey(new Date(), timeZone)
  const yesterday = addDays(today, -1)

  const activityDays = new Set(revisions.map(revision => getDateKey(revision.createdAt, timeZone)))
  if (activityDays.size === 0) {
    for (const stat of stats) {
      if (stat.words > 0 && stat.date <= today) activityDays.add(stat.date)
    }
  }

  let check: string | null = activityDays.has(today) ? today : (activityDays.has(yesterday) ? yesterday : null)
  while (check && activityDays.has(check)) {
    currentStreak++
    check = addDays(check, -1)
  }

  const sortedActivityDays = Array.from(activityDays).sort()
  if (sortedActivityDays.length > 0) {
    longestStreak = 1
    let current = 1
    for (let i = 1; i < sortedActivityDays.length; i++) {
      if (diffDays(sortedActivityDays[i - 1], sortedActivityDays[i]) === 1) current++
      else current = 1
      longestStreak = Math.max(longestStreak, current)
    }
  }

  const scripts = await prisma.script.findMany({
    where: { ownerId: session.user.id },
    select: { id: true, title: true, content: true },
  })

  const scriptStats = scripts.map(s => {
    const lines = parseScriptContent(s.content)
    const words = lines.reduce((acc, line) => acc + line.text.split(/\s+/).filter(Boolean).length, 0)
    const pages = getEstimatedPageLayout(lines).pageCount
    return { id: s.id, title: s.title, words, pages }
  })

  const totalWords = stats.filter(s => s.date <= today).reduce((acc, s) => acc + s.words, 0)
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
    dailyStats: stats.filter(s => s.date <= today).map(s => ({ date: s.date, words: s.words })),
    hourCounts,
  })
}
