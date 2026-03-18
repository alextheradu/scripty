export type ElementType =
  | 'SCENE_HEADING'
  | 'ACTION'
  | 'CHARACTER'
  | 'PARENTHETICAL'
  | 'DIALOGUE'
  | 'TRANSITION'
  | 'SHOT'
  | 'GENERAL'

export interface TextSegment {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

export interface ScriptLine {
  id: string
  type: ElementType
  text: string
  segments?: TextSegment[]
}

export interface SelectionRange {
  startLineId: string
  endLineId: string
  startOffset: number
  endOffset: number
  text: string
}

export interface ScriptComment {
  id: string
  body: string
  quotedText: string
  startLineId: string
  endLineId: string
  startOffset: number
  endOffset: number
  createdAt: string
  resolvedAt?: string | null
  resolvedBy?: {
    id: string
    name?: string | null
    email?: string | null
    displayName?: string | null
  } | null
  author: {
    id: string
    name?: string | null
    image?: string | null
    displayName?: string | null
    profileImage?: string | null
    email?: string | null
  }
  replies: {
    id: string
    body: string
    createdAt: string
    author: {
      id: string
      name?: string | null
      image?: string | null
      displayName?: string | null
      profileImage?: string | null
      email?: string | null
    }
  }[]
  reactions: {
    id: string
    emoji: string
    userId: string
  }[]
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
