import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/user/profile — get current user's profile
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, image: true, displayName: true, profileImage: true, createdAt: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ user })
}

// PATCH /api/user/profile — update displayName and/or profileImage
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: { displayName?: string; profileImage?: string | null } = {}

  if ('displayName' in body) {
    const name = (body.displayName ?? '').trim()
    if (name.length > 60) return NextResponse.json({ error: 'Display name too long (max 60 chars)' }, { status: 400 })
    updates.displayName = name || null as unknown as string
  }
  if ('profileImage' in body) {
    // Accept a URL string or null to clear
    const img = body.profileImage
    if (img !== null && typeof img !== 'string') {
      return NextResponse.json({ error: 'Invalid profileImage' }, { status: 400 })
    }
    updates.profileImage = img
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updates,
    select: { id: true, email: true, name: true, image: true, displayName: true, profileImage: true },
  })
  return NextResponse.json({ user })
}
