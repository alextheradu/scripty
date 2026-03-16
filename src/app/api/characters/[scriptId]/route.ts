import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getScriptAccess } from '@/lib/scriptHelpers'

export async function GET(req: NextRequest, { params }: { params: { scriptId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getScriptAccess(params.scriptId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const characters = await prisma.character.findMany({ where: { scriptId: params.scriptId } })
  return NextResponse.json({ characters })
}

export async function POST(req: NextRequest, { params }: { params: { scriptId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getScriptAccess(params.scriptId, session.user.id)
  if (!access || access.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { name, notes } = await req.json()
  const character = await prisma.character.upsert({
    where: { name_scriptId: { name: name.toUpperCase(), scriptId: params.scriptId } },
    update: { notes },
    create: { name: name.toUpperCase(), notes, scriptId: params.scriptId },
  })
  return NextResponse.json({ character })
}
