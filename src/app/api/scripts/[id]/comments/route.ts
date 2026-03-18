import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, roleAtLeast } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getScriptAccess } from '@/lib/scriptHelpers'

export const commentInclude = {
  author: {
    select: {
      id: true,
      name: true,
      image: true,
      displayName: true,
      profileImage: true,
      email: true,
    },
  },
  resolvedBy: {
    select: {
      id: true,
      name: true,
      displayName: true,
      email: true,
    },
  },
  replies: {
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          displayName: true,
          profileImage: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
  reactions: {
    select: {
      id: true,
      emoji: true,
      userId: true,
    },
    orderBy: { emoji: 'asc' },
  },
} as const

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getScriptAccess(id, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const comments = await prisma.scriptComment.findMany({
    where: { scriptId: id },
    include: commentInclude,
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ comments })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getScriptAccess(id, session.user.id)
  if (!access || !roleAtLeast(access.role, 'viewer')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const commentBody = String(body.body ?? '').trim()
  const quotedText = String(body.quotedText ?? '').trim()
  const startLineId = String(body.startLineId ?? '')
  const endLineId = String(body.endLineId ?? '')
  const startOffset = Number(body.startOffset ?? -1)
  const endOffset = Number(body.endOffset ?? -1)

  if (!commentBody) return NextResponse.json({ error: 'Comment text is required.' }, { status: 400 })
  if (!quotedText) return NextResponse.json({ error: 'Select text before commenting.' }, { status: 400 })
  if (!startLineId || !endLineId || startOffset < 0 || endOffset < 0) {
    return NextResponse.json({ error: 'Invalid comment anchor.' }, { status: 400 })
  }

  const comment = await prisma.scriptComment.create({
    data: {
      body: commentBody,
      quotedText,
      startLineId,
      endLineId,
      startOffset,
      endOffset,
      scriptId: id,
      authorId: session.user.id,
    },
    include: commentInclude,
  })

  const io = (globalThis as { io?: { to: (room: string) => { emit: (event: string, payload: unknown) => void } } }).io
  io?.to(`script:${id}`).emit('comment:create', { comment })

  return NextResponse.json({ comment })
}
