import type { ScriptLine } from '../editor/types'
import { formatDisplayDate, type ExportMetadata } from './types'

export function toFountain(metadata: ExportMetadata, lines: ScriptLine[]): string {
  const header = `Title: ${metadata.title}\nCredit: Written by\nAuthor: ${metadata.writtenBy}\nDate: ${formatDisplayDate(metadata.date)}\n\n===\n\n`

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
