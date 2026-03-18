/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from './db'
import { addDays, getDateKey } from './dates'
import { parseScriptContent } from './editor/content'
import { getEstimatedPageLayout } from './screenplayLayout'

export function countWords(contentJson: string): number {
  const lines = parseScriptContent(contentJson)
  return lines.reduce((acc, line) => acc + line.text.split(/\s+/).filter(Boolean).length, 0)
}

export async function updateWritingStats(userId: string, contentJson: string, timeZone?: string) {
  const words = countWords(contentJson)
  const today = getDateKey(new Date(), timeZone)
  const tomorrow = addDays(today, 1)

  await prisma.$transaction(async tx => {
    await tx.writingStats.upsert({
      where: { userId_date: { userId, date: today } },
      update: { words },
      create: { userId, date: today, words },
    })

    // Clean up the bogus "tomorrow" entry created by the old UTC-based logic.
    await tx.writingStats.deleteMany({
      where: { userId, date: tomorrow },
    })
  })
}

export async function getScriptAccess(
  scriptId: string,
  userId: string
): Promise<{ script: any; role: string } | null> {
  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    include: { collaborators: true },
  })
  if (!script) return null
  if (script.ownerId === userId) return { script, role: 'admin' }
  const collab = script.collaborators.find((c: any) => c.userId === userId)
  if (!collab) return null
  return { script, role: collab.role }
}

export function scriptSummary(s: any) {
  const lines = parseScriptContent(s.content)
  const wordCount = lines.reduce((acc: number, line) => acc + line.text.split(/\s+/).filter(Boolean).length, 0)
  const pageCount = getEstimatedPageLayout(lines).pageCount
  return {
    id: s.id, title: s.title,
    updatedAt: s.updatedAt, createdAt: s.createdAt,
    wordCount, pageCount,
    collaborators: s.collaborators?.map((c: any) => ({ name: c.user?.name, image: c.user?.image, role: c.role })) ?? [],
    owner: s.owner ? { name: s.owner.name, image: s.owner.image } : undefined,
  }
}
