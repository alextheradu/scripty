import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, roleAtLeast } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getScriptAccess } from '@/lib/scriptHelpers'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getScriptAccess(id, session.user.id)
  if (!access || !roleAtLeast(access.role, 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { enable } = await req.json()
  const script = access.script
  const shareToken = enable ? (script.shareToken ?? crypto.randomUUID()) : null
  const updated = await prisma.script.update({
    where: { id },
    data: { shareToken, publicAccess: !!enable },
  })
  return NextResponse.json({ shareToken: updated.shareToken })
}
