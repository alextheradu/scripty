import type { ScriptLine } from '../editor/types'
import { getLineHtml } from '../editor/content'
import { LINE_STYLES } from '../editor/lineStyles'
import { formatDisplayDate, type ExportMetadata } from './types'
import {
  getEstimatedRenderedLines,
  SCREENPLAY_FONT_SIZE,
  SCREENPLAY_LINE_HEIGHT,
  SCREENPLAY_LINES_PER_PAGE,
  SCREENPLAY_PAGE_HEIGHT,
  SCREENPLAY_PAGE_PADDING,
  SCREENPLAY_PAGE_WIDTH,
} from '../screenplayLayout'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function splitDialogueForMoreContd(lines: ScriptLine[]): ScriptLine[] {
  const result: ScriptLine[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.type === 'CHARACTER') {
      const charName = line.text.trim().toUpperCase()
      result.push(line)
      i++

      const block: ScriptLine[] = []
      while (i < lines.length && (lines[i].type === 'DIALOGUE' || lines[i].type === 'PARENTHETICAL')) {
        block.push(lines[i])
        i++
      }

      let totalLines = 0
      for (const blockLine of block) {
        totalLines += getEstimatedRenderedLines(blockLine) + 1
      }

      if (totalLines > 10) {
        let lineCount = 0
        let splitAt = -1

        for (let j = 0; j < block.length; j++) {
          lineCount += getEstimatedRenderedLines(block[j]) + 1
          if (lineCount > totalLines / 2 && block[j].type === 'DIALOGUE' && splitAt === -1) {
            splitAt = j
          }
        }

        if (splitAt > 0 && splitAt < block.length - 1) {
          for (let j = 0; j <= splitAt; j++) result.push(block[j])
          result.push({ id: `more-${line.id}`, type: 'PARENTHETICAL', text: '(MORE)' })
          result.push({ id: `contd-${line.id}`, type: 'CHARACTER', text: `${charName} (CONT'D)` })
          for (let j = splitAt + 1; j < block.length; j++) result.push(block[j])
        } else {
          result.push(...block)
        }
      } else {
        result.push(...block)
      }
    } else {
      result.push(line)
      i++
    }
  }

  return result
}

function buildPageParagraph(line: ScriptLine): string {
  const style = LINE_STYLES[line.type]
  const styles = [
    style.fontWeight ? `font-weight:${style.fontWeight}` : '',
    style.textTransform ? `text-transform:${style.textTransform}` : '',
    style.fontStyle ? `font-style:${style.fontStyle}` : '',
    style.marginLeft ? `margin-left:${style.marginLeft}` : '',
    style.marginRight ? `margin-right:${style.marginRight}` : '',
    style.textAlign ? `text-align:${style.textAlign}` : '',
  ].filter(Boolean).join(';')

  return `<p class="line" style="${styles}">${getLineHtml(line) || '&nbsp;'}</p>`
}

function paginateScreenplay(lines: ScriptLine[]): ScriptLine[][] {
  const processedLines = splitDialogueForMoreContd(lines)
  const pages: ScriptLine[][] = []
  let currentPage: ScriptLine[] = []
  let usedLines = 0

  for (const line of processedLines) {
    const lineHeight = getEstimatedRenderedLines(line)
    const shouldBreak = currentPage.length > 0 && usedLines + lineHeight > SCREENPLAY_LINES_PER_PAGE

    if (shouldBreak) {
      pages.push(currentPage)
      currentPage = []
      usedLines = 0
    }

    currentPage.push(line)
    usedLines += lineHeight
  }

  if (currentPage.length > 0 || pages.length === 0) {
    pages.push(currentPage)
  }

  return pages
}

function buildScreenplayPages(lines: ScriptLine[]): string {
  return paginateScreenplay(lines).map((pageLines, index) => {
    const pageNumber = index + 1

    return `<section class="screenplay-page">
  <div class="page-number">${pageNumber}.</div>
  <div class="page-content">
${pageLines.map(buildPageParagraph).join('\n')}
  </div>
</section>`
  }).join('\n')
}

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap');
  @page { size: letter; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: 'Courier Prime', 'Courier New', Courier, monospace;
    font-size: ${SCREENPLAY_FONT_SIZE};
    line-height: ${SCREENPLAY_LINE_HEIGHT};
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .line {
    margin: 0;
    min-height: 1em;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    page-break-inside: avoid;
  }
`

export function buildPDFTitlePageHtml(metadata: ExportMetadata): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  ${baseStyles}
  .title-page {
    width: ${SCREENPLAY_PAGE_WIDTH};
    min-height: ${SCREENPLAY_PAGE_HEIGHT};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: ${SCREENPLAY_PAGE_PADDING};
    text-align: center;
  }
  .title-page h1 {
    margin: 0 0 3em;
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
  }
  .title-page p { margin: 0; }
  .title-page .date { margin-top: 3em; }
</style>
</head>
<body>
<div class="title-page">
  <h1>${escapeHtml(metadata.title)}</h1>
  <p>Written by</p>
  <p>${escapeHtml(metadata.writtenBy)}</p>
  <p class="date">${escapeHtml(formatDisplayDate(metadata.date))}</p>
</div>
</body>
</html>`
}

export function buildPDFScreenplayHtml(lines: ScriptLine[]): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  ${baseStyles}
  .screenplay-page {
    position: relative;
    width: ${SCREENPLAY_PAGE_WIDTH};
    min-height: ${SCREENPLAY_PAGE_HEIGHT};
    box-sizing: border-box;
    padding: ${SCREENPLAY_PAGE_PADDING};
    break-after: page;
    page-break-after: always;
  }
  .screenplay-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }
  .page-number {
    position: absolute;
    top: 0.5in;
    right: 1in;
  }
</style>
</head>
<body>
${buildScreenplayPages(lines)}
</body>
</html>`
}

export function buildPDFDocumentHtml(metadata: ExportMetadata, lines: ScriptLine[]): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  ${baseStyles}
  .title-page {
    width: ${SCREENPLAY_PAGE_WIDTH};
    min-height: ${SCREENPLAY_PAGE_HEIGHT};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: ${SCREENPLAY_PAGE_PADDING};
    text-align: center;
    break-after: page;
    page-break-after: always;
  }
  .title-page h1 {
    margin: 0 0 3em;
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
  }
  .title-page p { margin: 0; }
  .title-page .date { margin-top: 3em; }
  .screenplay-page {
    position: relative;
    width: ${SCREENPLAY_PAGE_WIDTH};
    min-height: ${SCREENPLAY_PAGE_HEIGHT};
    box-sizing: border-box;
    padding: ${SCREENPLAY_PAGE_PADDING};
    break-after: page;
    page-break-after: always;
  }
  .screenplay-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }
  .page-number {
    position: absolute;
    top: 0.5in;
    right: 1in;
  }
</style>
</head>
<body>
<section class="title-page">
  <h1>${escapeHtml(metadata.title)}</h1>
  <p>Written by</p>
  <p>${escapeHtml(metadata.writtenBy)}</p>
  <p class="date">${escapeHtml(formatDisplayDate(metadata.date))}</p>
</section>
${buildScreenplayPages(lines)}
</body>
</html>`
}
