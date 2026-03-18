import type { ScriptLine, TextSegment } from './types'

function segmentKey(segment: TextSegment): string {
  return `${segment.bold ? '1' : '0'}${segment.italic ? '1' : '0'}${segment.underline ? '1' : '0'}`
}

export function normalizeSegments(segments: TextSegment[] | undefined, fallbackText = ''): TextSegment[] {
  const source = Array.isArray(segments) && segments.length > 0 ? segments : [{ text: fallbackText }]
  const normalized: TextSegment[] = []

  for (const segment of source) {
    const text = typeof segment?.text === 'string' ? segment.text : ''
    if (!text) continue

    const next: TextSegment = {
      text,
      ...(segment.bold ? { bold: true } : {}),
      ...(segment.italic ? { italic: true } : {}),
      ...(segment.underline ? { underline: true } : {}),
    }

    const previous = normalized[normalized.length - 1]
    if (previous && segmentKey(previous) === segmentKey(next)) {
      previous.text += next.text
    } else {
      normalized.push(next)
    }
  }

  return normalized
}

export function getPlainTextFromSegments(segments: TextSegment[] | undefined): string {
  return normalizeSegments(segments).map(segment => segment.text).join('')
}

export function normalizeScriptLine(line: Partial<ScriptLine> | null | undefined, index = 0): ScriptLine {
  const text = typeof line?.text === 'string' ? line.text : getPlainTextFromSegments(line?.segments)
  const segments = normalizeSegments(line?.segments, text)

  return {
    id: typeof line?.id === 'string' && line.id ? line.id : `line-${index}`,
    type: line?.type ?? 'ACTION',
    text,
    ...(segments.length > 0 ? { segments } : {}),
  }
}

export function normalizeScriptLines(value: unknown): ScriptLine[] {
  if (!Array.isArray(value) || value.length === 0) return []
  return value.map((line, index) => normalizeScriptLine(line as Partial<ScriptLine>, index))
}

export function parseScriptContent(content: string | null | undefined): ScriptLine[] {
  try {
    return normalizeScriptLines(JSON.parse(content || '[]'))
  } catch {
    return []
  }
}

export function serializeScriptContent(lines: ScriptLine[]): string {
  return JSON.stringify(normalizeScriptLines(lines))
}

export function scriptLinesEqual(a: ScriptLine[], b: ScriptLine[]): boolean {
  return serializeScriptContent(a) === serializeScriptContent(b)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function openSegmentMarks(segment: TextSegment): string {
  const opens = []
  if (segment.bold) opens.push('<strong>')
  if (segment.italic) opens.push('<em>')
  if (segment.underline) opens.push('<u>')
  return opens.join('')
}

function closeSegmentMarks(segment: TextSegment): string {
  const closes = []
  if (segment.underline) closes.push('</u>')
  if (segment.italic) closes.push('</em>')
  if (segment.bold) closes.push('</strong>')
  return closes.join('')
}

export function getLineHtml(line: ScriptLine): string {
  const segments = normalizeSegments(line.segments, line.text)
  if (segments.length === 0) return ''

  return segments
    .map(segment => `${openSegmentMarks(segment)}${escapeHtml(segment.text)}${closeSegmentMarks(segment)}`)
    .join('')
}

export function getLineSegments(line: ScriptLine): TextSegment[] {
  return normalizeSegments(line.segments, line.text)
}
