import type { ScriptLine } from '../editor/types'
import { getLineSegments } from '../editor/content'
import { escapeHtml, formatDisplayDate, type ExportMetadata } from './types'

const FDX_TYPES: Record<string, string> = {
  SCENE_HEADING: 'Scene Heading',
  ACTION: 'Action',
  CHARACTER: 'Character',
  PARENTHETICAL: 'Parenthetical',
  DIALOGUE: 'Dialogue',
  TRANSITION: 'Transition',
  SHOT: 'Shot',
  GENERAL: 'General',
}

export function toFDX(metadata: ExportMetadata, lines: ScriptLine[]): string {
  const paragraphs = lines.map(l => {
    const fdxType = FDX_TYPES[l.type] ?? 'Action'
    const textNodes = getLineSegments(l)
      .map(segment => {
        const style = [
          segment.bold ? 'Bold' : '',
          segment.italic ? 'Italic' : '',
          segment.underline ? 'Underline' : '',
        ].filter(Boolean).join('+')

        const styleAttr = style ? ` Style="${style}"` : ''
        return `<Text${styleAttr}>${escapeHtml(segment.text)}</Text>`
      })
      .join('')

    return `    <Paragraph Type="${fdxType}">${textNodes || '<Text></Text>'}</Paragraph>`
  }).join('\n')

  const title = escapeHtml(metadata.title)
  const writtenBy = escapeHtml(metadata.writtenBy)
  const date = escapeHtml(formatDisplayDate(metadata.date))

  return `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
${paragraphs}
  </Content>
  <TitlePage>
    <Content>
      <Paragraph Alignment="Center" Type="Custom"><Text>${title}</Text></Paragraph>
      <Paragraph Alignment="Center" Type="Custom"><Text>Written by</Text></Paragraph>
      <Paragraph Alignment="Center" Type="Custom"><Text>${writtenBy}</Text></Paragraph>
      <Paragraph Alignment="Center" Type="Custom"><Text>${date}</Text></Paragraph>
    </Content>
  </TitlePage>
</FinalDraft>`
}
