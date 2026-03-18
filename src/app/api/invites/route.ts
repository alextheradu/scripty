import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, ADMIN_EMAIL } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendPlatformInvite } from '@/lib/mailer'

// GET /api/invites — list all invites (admin only)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: 'desc' },
    include: { invitedBy: { select: { name: true, email: true } } },
  })
  return NextResponse.json({ invites })
}

// POST /api/invites — send an invite (admin only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }
  const normalised = email.trim().toLowerCase()

  // Check if already a user
  const existing = await prisma.user.findUnique({ where: { email: normalised } })
  if (existing) {
    return NextResponse.json({ error: 'This email is already a registered user.' }, { status: 409 })
  }

  const invite = await prisma.invite.upsert({
    where: { email: normalised },
    update: { invitedById: session.user.id, createdAt: new Date(), usedAt: null },
    create: { email: normalised, invitedById: session.user.id },
  })

  // Send invitation email — fire-and-forget, don't block the response
  const inviterName = session.user.displayName ?? session.user.name ?? 'Someone'
  sendPlatformInvite({ toEmail: normalised, inviterName }).catch(err =>
    console.error('[mailer] platform invite failed:', err.message)
  )

  return NextResponse.json({ invite }, { status: 201 })
}

// DELETE /api/invites — revoke an invite (admin only)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  await prisma.invite.deleteMany({ where: { email: email.trim().toLowerCase() } })
  return NextResponse.json({ ok: true })
}
