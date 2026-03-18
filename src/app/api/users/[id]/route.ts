import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, ADMIN_EMAIL } from '@/lib/auth'
import { prisma } from '@/lib/db'

// DELETE /api/users/[id] — kick a user from the platform (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // Refuse to kick the admin themselves
  if (session.user.id === id) {
    return NextResponse.json({ error: 'Cannot remove your own account.' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } })
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

  // Also refuse to kick by email match just in case
  if (target.email?.toLowerCase() === ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Cannot remove the admin account.' }, { status: 400 })
  }

  // Delete in dependency order to satisfy FK constraints.
  // Only Account and Session have onDelete: Cascade in the schema;
  // everything else must be removed manually first.
  await prisma.$transaction([
    // Remove collaborator memberships on other people's scripts
    prisma.scriptCollaborator.deleteMany({ where: { userId: id } }),
    // Remove chat messages
    prisma.message.deleteMany({ where: { userId: id } }),
    // Remove writing stats
    prisma.writingStats.deleteMany({ where: { userId: id } }),
    // Remove revisions authored by this user
    prisma.revision.deleteMany({ where: { authorId: id } }),
    // Remove scripts they own (and their collaborators, messages, revisions, characters)
    // We need to delete child records of each owned script first.
  ])

  // Delete owned scripts (need to clean their children first)
  const ownedScripts = await prisma.script.findMany({
    where: { ownerId: id },
    select: { id: true },
  })
  const scriptIds = ownedScripts.map(s => s.id)
  if (scriptIds.length > 0) {
    await prisma.$transaction([
      prisma.scriptCollaborator.deleteMany({ where: { scriptId: { in: scriptIds } } }),
      prisma.message.deleteMany({ where: { scriptId: { in: scriptIds } } }),
      prisma.revision.deleteMany({ where: { scriptId: { in: scriptIds } } }),
      prisma.character.deleteMany({ where: { scriptId: { in: scriptIds } } }),
      prisma.script.deleteMany({ where: { id: { in: scriptIds } } }),
    ])
  }

  // Now delete the user (Account + Session cascade automatically)
  await prisma.user.delete({ where: { id } })

  // Re-open invite slot so they could be re-invited later if needed.
  await prisma.invite.updateMany({
    where: { email: target.email! },
    data: { usedAt: null },
  })

  return NextResponse.json({ ok: true })
}
