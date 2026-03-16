import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getScriptAccess } from '@/lib/scriptHelpers'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getScriptAccess(params.id, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const revisions = await prisma.revision.findMany({
    where: { scriptId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ revisions })
}
