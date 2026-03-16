import { prisma } from './db'

export function countWords(contentJson: string): number {
  const lines: any[] = JSON.parse(contentJson || '[]')
  return lines.reduce((acc, l) => acc + (l.text?.split(/\s+/).filter(Boolean).length ?? 0), 0)
}

export async function updateWritingStats(userId: string, contentJson: string) {
  const words = countWords(contentJson)
  const today = new Date().toISOString().slice(0, 10)
  await prisma.writingStats.upsert({
    where: { userId_date: { userId, date: today } },
    update: { words },
    create: { userId, date: today, words },
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
  const lines: any[] = JSON.parse(s.content || '[]')
  const wordCount = lines.reduce((acc: number, l: any) => acc + (l.text?.split(/\s+/).filter(Boolean).length ?? 0), 0)
  const pageCount = Math.max(1, Math.ceil(lines.length / 55))
  return {
    id: s.id, title: s.title,
    updatedAt: s.updatedAt, createdAt: s.createdAt,
    wordCount, pageCount,
    collaborators: s.collaborators?.map((c: any) => ({ name: c.user?.name, image: c.user?.image, role: c.role })) ?? [],
    owner: s.owner ? { name: s.owner.name, image: s.owner.image } : undefined,
  }
}
