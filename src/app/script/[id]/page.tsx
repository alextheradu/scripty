import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ScriptEditorClient } from './ScriptEditorClient'

export default async function ScriptPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/api/auth/signin')

  const script = await prisma.script.findUnique({
    where: { id: params.id },
    include: { collaborators: { include: { user: true } }, owner: true },
  })

  if (!script) notFound()

  const isOwner = script.ownerId === session.user.id
  const collab = script.collaborators.find(c => c.userId === session.user.id)
  if (!isOwner && !collab) notFound()

  const readOnly = collab?.role === 'viewer'
  const isAdmin = isOwner || collab?.role === 'admin'
  const lines = JSON.parse(script.content || '[]')

  return (
    <ScriptEditorClient
      scriptId={script.id}
      initialTitle={script.title}
      initialLines={lines}
      userId={session.user.id}
      userName={session.user.name ?? 'User'}
      userImage={session.user.image ?? undefined}
      readOnly={readOnly}
      isAdmin={isAdmin}
      shareToken={script.shareToken ?? null}
    />
  )
}
