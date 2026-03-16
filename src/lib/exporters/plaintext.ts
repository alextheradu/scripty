import type { ScriptLine } from '../editor/types'

function pad(text: string, left: number): string {
  return ' '.repeat(left) + text
}

export function toPlainText(title: string, lines: ScriptLine[]): string {
  const header = `${title.toUpperCase()}\n\n`
  const body = lines.map(l => {
    const t = l.text.trim()
    if (!t) return ''
    switch (l.type) {
      case 'SCENE_HEADING': return `\n${t.toUpperCase()}\n`
      case 'ACTION': return t
      case 'CHARACTER': return `\n${pad(t.toUpperCase(), 35)}`
      case 'PARENTHETICAL': return pad(`(${t.replace(/^\(|\)$/g, '')})`, 29)
      case 'DIALOGUE': return pad(t, 24)
      case 'TRANSITION': return `\n${pad(t.toUpperCase(), 60)}\n`
      case 'SHOT': return `\n${t.toUpperCase()}\n`
      default: return t
    }
  }).join('\n')
  return header + body
}
