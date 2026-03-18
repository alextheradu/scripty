import type { ElementType } from './types'

export interface LineStyle {
  fontWeight?: string
  textTransform?: 'uppercase' | 'none'
  fontStyle?: 'italic' | 'normal'
  marginLeft?: string
  marginRight?: string
  textAlign?: 'left' | 'right'
  width?: string
  color?: string
}

export const LINE_STYLES: Record<ElementType, LineStyle> = {
  SCENE_HEADING: { fontWeight: '700', textTransform: 'uppercase' },
  ACTION: {},
  CHARACTER: { textTransform: 'uppercase', marginLeft: '2.2in', marginRight: '1in' },
  PARENTHETICAL: { fontStyle: 'italic', marginLeft: '1.5in', marginRight: '1.4in' },
  DIALOGUE: { marginLeft: '1in', marginRight: '0.5in' },
  TRANSITION: { textTransform: 'uppercase', textAlign: 'right' },
  SHOT: { textTransform: 'uppercase' },
  GENERAL: { color: '#888' },
}

export const ELEMENT_LABELS: Record<ElementType, string> = {
  SCENE_HEADING: 'Scene Heading',
  ACTION: 'Action',
  CHARACTER: 'Character',
  PARENTHETICAL: 'Parenthetical',
  DIALOGUE: 'Dialogue',
  TRANSITION: 'Transition',
  SHOT: 'Shot',
  GENERAL: 'General',
}
