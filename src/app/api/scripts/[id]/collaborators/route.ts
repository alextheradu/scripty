import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, roleAtLeast } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getScriptAccess } from '@/lib/scriptHelpers'
import { sendCollaboratorInvite } from '@/lib/mailer'

const collaboratorInclude = {
  user: {
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      displayName: true,
      profileImage: true,
    },
  },
} as const

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getScriptAccess(id, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const collaborators = await prisma.scriptCollaborator.findMany({
    where: { scriptId: id },
    include: collaboratorInclude,
  })
  return NextResponse.json({ collaborators })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getScriptAccess(id, session.user.id)
  if (!access || !roleAtLeast(access.role, 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, role = 'editor' } = await req.json()
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) return NextResponse.json({ error: 'User not found. They must sign in first.' }, { status: 404 })

  const collab = await prisma.scriptCollaborator.upsert({
    where: { userId_scriptId: { userId: user.id, scriptId: id } },
    update: { role },
    create: { userId: user.id, scriptId: id, role },
    include: collaboratorInclude,
  })

  // Fetch script title for the notification email
  const script = await prisma.script.findUnique({ where: { id }, select: { title: true } })
  const inviterName = session.user.displayName ?? session.user.name ?? 'Someone'

  sendCollaboratorInvite({
    toEmail: user.email,
    toName: user.displayName ?? user.name ?? '',
    inviterName,
    scriptTitle: script?.title ?? 'Untitled Script',
    scriptId: id,
    role,
  }).catch(err => console.error('[mailer] collaborator invite failed:', err.message))

  return NextResponse.json({ collab })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getScriptAccess(id, session.user.id)
  if (!access || !roleAtLeast(access.role, 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { collaboratorId, role } = await req.json()
  if (!collaboratorId || typeof collaboratorId !== 'string') {
    return NextResponse.json({ error: 'Missing collaborator id.' }, { status: 400 })
  }
  if (!['viewer', 'editor', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
  }

  const collaborator = await prisma.scriptCollaborator.findUnique({
    where: { id: collaboratorId },
    include: collaboratorInclude,
  })
  if (!collaborator || collaborator.scriptId !== id) {
    return NextResponse.json({ error: 'Collaborator not found.' }, { status: 404 })
  }

  const updatedCollaborator = await prisma.scriptCollaborator.update({
    where: { id: collaboratorId },
    data: { role },
    include: collaboratorInclude,
  })

  return NextResponse.json({ collab: updatedCollaborator })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getScriptAccess(id, session.user.id)
  if (!access || !roleAtLeast(access.role, 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const collaboratorId = req.nextUrl.searchParams.get('collaboratorId')
  if (!collaboratorId) {
    return NextResponse.json({ error: 'Missing collaborator id.' }, { status: 400 })
  }

  const collaborator = await prisma.scriptCollaborator.findUnique({
    where: { id: collaboratorId },
    select: { id: true, scriptId: true },
  })
  if (!collaborator || collaborator.scriptId !== id) {
    return NextResponse.json({ error: 'Collaborator not found.' }, { status: 404 })
  }

  await prisma.scriptCollaborator.delete({ where: { id: collaboratorId } })
  return NextResponse.json({ ok: true })
}
