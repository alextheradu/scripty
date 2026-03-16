/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, roleAtLeast } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getScriptAccess, updateWritingStats } from '@/lib/scriptHelpers'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getScriptAccess(params.id, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ script: access.script })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getScriptAccess(params.id, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!roleAtLeast(access.role, 'editor'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const updates: any = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.content !== undefined) {
    updates.content = typeof body.content === 'string' ? body.content : JSON.stringify(body.content)
    await updateWritingStats(session.user.id, updates.content)
  }

  const script = await prisma.script.update({ where: { id: params.id }, data: updates })

  // Auto-snapshot every 5 minutes if content changed
  if (body.content !== undefined) {
    const lastRev = await prisma.revision.findFirst({
      where: { scriptId: params.id },
      orderBy: { createdAt: 'desc' },
    })
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    if (!lastRev || lastRev.createdAt < fiveMinAgo) {
      await prisma.revision.create({
        data: { scriptId: params.id, authorId: session.user.id, content: updates.content },
      })
      const all = await prisma.revision.findMany({
        where: { scriptId: params.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      if (all.length > 50) {
        await prisma.revision.deleteMany({ where: { id: { in: all.slice(50).map(r => r.id) } } })
      }
    }
  }

  return NextResponse.json({ script })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const script = await prisma.script.findUnique({ where: { id: params.id } })
  if (!script || script.ownerId !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.script.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
