import type { ScriptLine } from '../editor/types'

export function toFountain(title: string, lines: ScriptLine[]): string {
  const header = `Title: ${title}\nCredit: Written by\nDate: ${new Date().toLocaleDateString()}\n\n===\n\n`

  const body = lines.map(l => {
    const t = l.text.trim()
    switch (l.type) {
      case 'SCENE_HEADING': return t.toUpperCase()
      case 'ACTION': return t
      case 'CHARACTER': return `\t${t.toUpperCase()}`
      case 'PARENTHETICAL': return `\t(${t.replace(/^\(|\)$/g, '')})`
      case 'DIALOGUE': return `\t\t${t}`
      case 'TRANSITION': return `\t\t\t\t${t.toUpperCase()}`
      case 'SHOT': return t.toUpperCase()
      default: return t
    }
  }).join('\n')

  return header + body
}
