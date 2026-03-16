import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const script = await prisma.script.findUnique({ where: { id: params.id } })
  if (!script || script.ownerId !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { enable } = await req.json()
  const shareToken = enable ? (script.shareToken ?? crypto.randomUUID()) : null
  const updated = await prisma.script.update({
    where: { id: params.id },
    data: { shareToken, publicAccess: !!enable },
  })
  return NextResponse.json({ shareToken: updated.shareToken })
}
