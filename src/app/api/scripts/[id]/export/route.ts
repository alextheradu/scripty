import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { toFountain } from '@/lib/exporters/fountain'
import { toFDX } from '@/lib/exporters/fdx'
import { toPlainText } from '@/lib/exporters/plaintext'
import { buildPDFHtml } from '@/lib/exporters/pdf'
import { getScriptAccess } from '@/lib/scriptHelpers'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getScriptAccess(params.id, session.user.id)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const format = req.nextUrl.searchParams.get('format') ?? 'pdf'

  const script = await prisma.script.findUnique({ where: { id: params.id } })
  if (!script) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lines = JSON.parse(script.content || '[]')
  const title = script.title
  const safeTitle = title.replace(/["\r\n]/g, '_')

  if (format === 'fountain') {
    const content = toFountain(title, lines)
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain', 'Content-Disposition': `attachment; filename="${safeTitle}.fountain"` },
    })
  }

  if (format === 'fdx') {
    const content = toFDX(title, lines)
    return new NextResponse(content, {
      headers: { 'Content-Type': 'application/xml', 'Content-Disposition': `attachment; filename="${safeTitle}.fdx"` },
    })
  }

  if (format === 'txt') {
    const content = toPlainText(title, lines)
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain', 'Content-Disposition': `attachment; filename="${safeTitle}.txt"` },
    })
  }

  // PDF via Puppeteer
  const { default: puppeteer } = await import('puppeteer')
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.setContent(buildPDFHtml(title, lines), { waitUntil: 'networkidle0' })
    const pdfData = await page.pdf({ format: 'Letter', printBackground: false })
    const pdf = Buffer.from(pdfData)
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeTitle}.pdf"`,
      },
    })
  } finally {
    await browser.close()
  }
}
