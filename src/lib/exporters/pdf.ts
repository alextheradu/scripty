import type { ScriptLine } from '../editor/types'
import { LINE_STYLES } from '../editor/lineStyles'

export function buildPDFHtml(title: string, lines: ScriptLine[]): string {
  const paragraphs = lines.map(l => {
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
