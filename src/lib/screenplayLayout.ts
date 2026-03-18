import type { ScriptLine } from './editor/types'

export const SCREENPLAY_PAGE_WIDTH = '8.5in'
export const SCREENPLAY_PAGE_HEIGHT = '11in'
export const SCREENPLAY_PAGE_PADDING = '1in 1in 1in 1.5in'
export const SCREENPLAY_FONT_SIZE = '12pt'
export const SCREENPLAY_LINE_HEIGHT = 1
export const SCREENPLAY_LINES_PER_PAGE = 54

const CHARS_PER_LINE = 62

const CHARS_PER_TYPE: Partial<Record<ScriptLine['type'], number>> = {
  CHARACTER: 32,
  PARENTHETICAL: 28,
  DIALOGUE: 36,
}

export interface EstimatedPageLayout {
  breakBeforeLineIds: string[]
  pageNumberByLineId: Record<string, number>
  pageCount: number
}

export function getEstimatedRenderedLines(line: ScriptLine): number {
  const charsPerLine = CHARS_PER_TYPE[line.type] ?? CHARS_PER_LINE
  const text = line.text.trim()
  if (!text) return 1

  return Math.max(1, Math.ceil(text.length / charsPerLine))
}

export function getEstimatedPageLayout(lines: ScriptLine[]): EstimatedPageLayout {
  const breakBeforeLineIds: string[] = []
  const pageNumberByLineId: Record<string, number> = {}

  let usedLines = 0
  let pageNumber = 1

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const lineHeight = getEstimatedRenderedLines(line)

    if (index > 0 && usedLines + lineHeight > SCREENPLAY_LINES_PER_PAGE) {
      pageNumber += 1
      usedLines = 0
      breakBeforeLineIds.push(line.id)
    }

    pageNumberByLineId[line.id] = pageNumber
    usedLines += lineHeight
  }

  return {
    breakBeforeLineIds,
    pageNumberByLineId,
    pageCount: Math.max(pageNumber, 1),
  }
}
