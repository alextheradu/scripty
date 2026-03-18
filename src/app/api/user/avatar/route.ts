import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { minioClient, MINIO_BUCKET, objectPublicUrl } from '@/lib/minio'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse multipart form — Next.js App Router exposes req.formData()
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Type check
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
      { status: 415 }
    )
  }

  // Size check
  const arrayBuf = await file.arrayBuffer()
  if (arrayBuf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 413 })
  }

  const buf = Buffer.from(arrayBuf)
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const key = `profile-images/${session.user.id}/${randomUUID()}.${ext}`

  try {
    await minioClient.putObject(MINIO_BUCKET, key, buf, buf.length, {
      'Content-Type': file.type,
      // Cache 30 days — avatars are immutable per UUID key
      'Cache-Control': 'public, max-age=2592000, immutable',
    })
  } catch (err) {
    console.error('[avatar upload] minio putObject failed:', err)
    return NextResponse.json({ error: 'Upload to storage failed' }, { status: 502 })
  }

  const url = objectPublicUrl(key)

  // Persist to DB and return
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { profileImage: url },
    select: { id: true, profileImage: true },
  })

  return NextResponse.json({ url: user.profileImage })
}
