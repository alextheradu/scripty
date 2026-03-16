import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { scriptSummary } from '@/lib/scriptHelpers'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [owned, collaborating] = await Promise.all([
    prisma.script.findMany({
      where: { ownerId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: { collaborators: { include: { user: true } }, owner: true },
    }),
    prisma.scriptCollaborator.findMany({
      where: { userId: session.user.id },
      include: {
        script: { include: { collaborators: { include: { user: true } }, owner: true } },
      },
      orderBy: { script: { updatedAt: 'desc' } },
    }),
  ])

  const ownedIds = new Set(owned.map(s => s.id))

  return NextResponse.json({
    owned: owned.map(scriptSummary),
    collaborating: collaborating
      .filter(c => !ownedIds.has(c.script.id))
      .map(c => scriptSummary(c.script)),
  })
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const script = await prisma.script.create({
    data: {
      ownerId: session.user.id,
      content: JSON.stringify([{ id: crypto.randomUUID(), type: 'ACTION', text: '' }]),
    },
  })

  return NextResponse.json({ id: script.id })
}
