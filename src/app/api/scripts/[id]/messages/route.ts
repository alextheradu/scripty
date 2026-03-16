import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const messages = await prisma.message.findMany({
    where: { scriptId: params.id },
    orderBy: { createdAt: 'asc' },
    take: 500,
    include: { user: true },
  })
  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })
  const message = await prisma.message.create({
    data: { text: text.trim().slice(0, 2000), userId: session.user.id, scriptId: params.id },
    include: { user: true },
  })
  return NextResponse.json({ message })
}
