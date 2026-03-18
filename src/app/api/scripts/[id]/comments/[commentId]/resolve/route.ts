import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, roleAtLeast } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getScriptAccess } from '@/lib/scriptHelpers'
import { commentInclude } from '@/app/api/scripts/[id]/comments/route'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id, commentId } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getScriptAccess(id, session.user.id)
  if (!access || !roleAtLeast(access.role, 'viewer')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const resolved = Boolean(body.resolved)

  await prisma.scriptComment.update({
    where: { id: commentId },
    data: {
      resolvedAt: resolved ? new Date() : null,
      resolvedById: resolved ? session.user.id : null,
    },
  })

  const updatedComment = await prisma.scriptComment.findUnique({
    where: { id: commentId },
    include: commentInclude,
  })

  const io = (globalThis as { io?: { to: (room: string) => { emit: (event: string, payload: unknown) => void } } }).io
  io?.to(`script:${id}`).emit('comment:update', { comment: updatedComment })

  return NextResponse.json({ comment: updatedComment })
}
