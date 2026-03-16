export type ElementType =
  | 'SCENE_HEADING'
  | 'ACTION'
  | 'CHARACTER'
  | 'PARENTHETICAL'
  | 'DIALOGUE'
  | 'TRANSITION'
  | 'SHOT'
  | 'GENERAL'

export interface ScriptLine {
  id: string
  type: ElementType
  text: string
}

export const ELEMENT_CYCLE: ElementType[] = [
  'ACTION', 'CHARACTER', 'DIALOGUE', 'PARENTHETICAL', 'TRANSITION', 'SCENE_HEADING', 'SHOT',
]

export const ENTER_NEXT: Record<ElementType, ElementType> = {
  SCENE_HEADING: 'ACTION',
  ACTION: 'ACTION',
  CHARACTER: 'DIALOGUE',
  DIALOGUE: 'CHARACTER',
  PARENTHETICAL: 'DIALOGUE',
  TRANSITION: 'SCENE_HEADING',
  SHOT: 'ACTION',
  GENERAL: 'GENERAL',
}

export const DOUBLE_ENTER_NEXT: Partial<Record<ElementType, ElementType>> = {
  ACTION: 'CHARACTER',
  DIALOGUE: 'ACTION',
}
