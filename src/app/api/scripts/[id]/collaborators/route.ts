import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, roleAtLeast } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getScriptAccess } from '@/lib/scriptHelpers'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getScriptAccess(params.id, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const collaborators = await prisma.scriptCollaborator.findMany({
    where: { scriptId: params.id },
    include: { user: true },
  })
  return NextResponse.json({ collaborators })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getScriptAccess(params.id, session.user.id)
  if (!access || !roleAtLeast(access.role, 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, role = 'editor' } = await req.json()
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) return NextResponse.json({ error: 'User not found. They must sign in first.' }, { status: 404 })

  const collab = await prisma.scriptCollaborator.upsert({
    where: { userId_scriptId: { userId: user.id, scriptId: params.id } },
    update: { role },
    create: { userId: user.id, scriptId: params.id, role },
    include: { user: true },
  })
  return NextResponse.json({ collab })
}
