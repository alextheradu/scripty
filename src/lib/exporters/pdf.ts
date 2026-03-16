import type { ScriptLine } from '../editor/types'
import { LINE_STYLES } from '../editor/lineStyles'

// Helper: estimate lines of text (12pt Courier Prime, ~62 chars per line at screenplay width)
const CHARS_PER_LINE = 62

function splitDialogueForMoreContd(
  lines: ScriptLine[]
): ScriptLine[] {
  const result: ScriptLine[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    // Look for CHARACTER followed by dialogue block
    if (line.type === 'CHARACTER') {
      const charName = line.text.trim().toUpperCase()
      result.push(line)
      i++
      // Collect the dialogue block
      const block: ScriptLine[] = []
      while (i < lines.length && (lines[i].type === 'DIALOGUE' || lines[i].type === 'PARENTHETICAL')) {
        block.push(lines[i])
        i++
      }
      // Estimate total lines in block
      let totalLines = 0
      for (const bl of block) {
        totalLines += Math.ceil(bl.text.length / CHARS_PER_LINE) + 1
      }
      // If block is long enough to potentially span a page (> 10 lines), insert MORE/CONT'D
      if (totalLines > 10) {
        // Split at midpoint by finding a DIALOGUE line near middle
        let lineCount = 0
        let splitAt = -1
        for (let j = 0; j < block.length; j++) {
          lineCount += Math.ceil(block[j].text.length / CHARS_PER_LINE) + 1
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

export function buildPDFHtml(title: string, lines: ScriptLine[]): string {
  const processedLines = splitDialogueForMoreContd(lines)
  const paragraphs = processedLines.map(l => {
    const s = LINE_STYLES[l.type]
    const styles = [
      s.fontWeight ? `font-weight:${s.fontWeight}` : '',
      s.textTransform ? `text-transform:${s.textTransform}` : '',
      s.fontStyle ? `font-style:${s.fontStyle}` : '',
      s.marginLeft ? `margin-left:${s.marginLeft}` : '',
      s.marginRight ? `margin-right:${s.marginRight}` : '',
      s.textAlign ? `text-align:${s.textAlign}` : '',
    ].filter(Boolean).join(';')

    const text = l.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    return `<p class="line" style="${styles}">${text || '&nbsp;'}</p>`
  }).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
  @page { margin: 1in 1in 1in 1.5in; size: letter; }
  body { font-family: 'Courier Prime', monospace; font-size: 12pt; line-height: 1.5; }
  .title-page { page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 9in; }
  .title-page h1 { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
  .line { margin: 0; min-height: 1.5em; }
  @page :right { @top-right { content: counter(page) '.'; font-family: 'Courier Prime', monospace; font-size: 12pt; } }
</style>
</head>
<body>
<div class="title-page">
  <h1>${title.replace(/</g, '&lt;')}</h1>
  <p>Written by</p>
  <p>${new Date().toLocaleDateString()}</p>
</div>
${paragraphs}
</body>
</html>`
}
