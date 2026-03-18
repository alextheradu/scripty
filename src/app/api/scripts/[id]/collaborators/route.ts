import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, roleAtLeast } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getScriptAccess } from '@/lib/scriptHelpers'
import { sendCollaboratorInvite } from '@/lib/mailer'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getScriptAccess(id, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const collaborators = await prisma.scriptCollaborator.findMany({
    where: { scriptId: id },
    include: { user: true },
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
    include: { user: true },
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
