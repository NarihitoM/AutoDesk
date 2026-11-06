export interface TranscriptLine {
  id: string
  text: string
  at: number
  open: boolean
}

export interface Suggestion {
  id: string
  question: string
  text: string
  at: number
  streaming: boolean
  error?: string
}

export type LiveStatus =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'listening' }
  | { kind: 'error'; message: string }

export interface LiveState {
  status: LiveStatus
  lines: TranscriptLine[]
  partial: string
  suggestions: Suggestion[]
  hotkey: string
}

export type LiveEvent =
  | { type: 'snapshot'; state: LiveState }
  | { type: 'status'; status: LiveStatus }
  | { type: 'line'; line: TranscriptLine }
  | { type: 'partial'; text: string }
  | { type: 'suggestion'; suggestion: Suggestion }
  | { type: 'delta'; id: string; text: string }

export type ListenerCommand = { type: 'start' } | { type: 'stop' }

export interface ListenerStatus {
  ok: boolean
  message?: string
}

export interface LiveSettings {
  language: string
  autoAnswer: boolean
  prompt: string
}
