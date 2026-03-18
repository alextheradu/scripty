import type { Browser, Page } from 'puppeteer'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { toFountain } from '@/lib/exporters/fountain'
import { toFDX } from '@/lib/exporters/fdx'
import { buildPDFDocumentHtml } from '@/lib/exporters/pdf'
import { toPlainText } from '@/lib/exporters/plaintext'
import type { ExportMetadata } from '@/lib/exporters/types'
import { getScriptAccess } from '@/lib/scriptHelpers'
import { parseScriptContent } from '@/lib/editor/content'

export const runtime = 'nodejs'

const globalForPdfBrowser = globalThis as typeof globalThis & {
  __scriptyPdfBrowser?: Promise<Browser>
}

function getRequiredParam(req: NextRequest, key: string): string | null {
  const value = req.nextUrl.searchParams.get(key)?.trim()
  return value ? value : null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getScriptAccess(id, session.user.id)
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const format = req.nextUrl.searchParams.get('format') ?? 'pdf'

  const script = await prisma.script.findUnique({ where: { id } })
  if (!script) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lines = parseScriptContent(script.content)
  const title = getRequiredParam(req, 'title') ?? script.title
  const writtenBy = getRequiredParam(req, 'writtenBy')
  const date = getRequiredParam(req, 'date')
  if (!writtenBy || !date) {
    return NextResponse.json({ error: 'Missing required export fields' }, { status: 400 })
  }

  const metadata: ExportMetadata = { title, writtenBy, date }
  const safeTitle = title.replace(/["\r\n]/g, '_')

  if (format === 'fountain') {
    const content = toFountain(metadata, lines)
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain', 'Content-Disposition': `attachment; filename="${safeTitle}.fountain"` },
    })
  }

  if (format === 'fdx') {
    const content = toFDX(metadata, lines)
    return new NextResponse(content, {
      headers: { 'Content-Type': 'application/xml', 'Content-Disposition': `attachment; filename="${safeTitle}.fdx"` },
    })
  }

  if (format === 'txt') {
    const content = toPlainText(metadata, lines)
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain', 'Content-Disposition': `attachment; filename="${safeTitle}.txt"` },
    })
  }

  const browser = await getPdfBrowser()
  const page = await browser.newPage()

  try {
    await page.emulateMediaType('print')
    const pdf = await renderPdf(page, buildPDFDocumentHtml(metadata, lines))

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeTitle}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF export failed', { scriptId: id, format, error })
    return NextResponse.json({ error: 'Failed to export PDF' }, { status: 500 })
  } finally {
    await page.close().catch(() => undefined)
  }
}

async function renderPdf(page: Page, html: string): Promise<Buffer> {
  await page.setContent(html, { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  const pdfData = await page.pdf({ format: 'Letter', printBackground: false })
  return Buffer.from(pdfData)
}

async function getPdfBrowser(): Promise<Browser> {
  if (globalForPdfBrowser.__scriptyPdfBrowser) {
    return globalForPdfBrowser.__scriptyPdfBrowser
  }

  let browserPromise: Promise<Browser>

  browserPromise = import('puppeteer')
    .then(async ({ default: puppeteer }) => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })

      browser.on('disconnected', () => {
        if (globalForPdfBrowser.__scriptyPdfBrowser === browserPromise) {
          delete globalForPdfBrowser.__scriptyPdfBrowser
        }
      })

      return browser
    })
    .catch(error => {
      delete globalForPdfBrowser.__scriptyPdfBrowser
      throw error
    })

  globalForPdfBrowser.__scriptyPdfBrowser = browserPromise
  return browserPromise
}
