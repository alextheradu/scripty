import type { ScriptLine } from '../editor/types'

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

export function toFDX(title: string, lines: ScriptLine[]): string {
  const paragraphs = lines.map(l => {
    const fdxType = FDX_TYPES[l.type] ?? 'Action'
    const text = l.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `    <Paragraph Type="${fdxType}"><Text>${text}</Text></Paragraph>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
${paragraphs}
  </Content>
  <TitlePage>
    <Content>
      <Paragraph Alignment="Center" Type="Custom"><Text>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Text></Paragraph>
    </Content>
  </TitlePage>
</FinalDraft>`
}
