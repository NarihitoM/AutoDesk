export type Speaker = 'them' | 'you'

export interface TranscriptLine {
  id: string
  speaker: Speaker
  text: string
  at: number
}

export interface Suggestion {
  id: string
  question: string
  text: string
  streaming: boolean
  error?: string
}

export type LiveStatus =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'listening'; speakers: Speaker[] }
  | { kind: 'error'; message: string }

export interface LiveState {
  status: LiveStatus
  lines: TranscriptLine[]
  suggestions: Suggestion[]
  hotkey: string
}

export type LiveEvent =
  | { type: 'snapshot'; state: LiveState }
  | { type: 'status'; status: LiveStatus }
  | { type: 'line'; line: TranscriptLine }
  | { type: 'suggestion'; suggestion: Suggestion }
  | { type: 'delta'; id: string; text: string }

export type ListenerCommand = { type: 'start'; system: boolean; mic: boolean } | { type: 'stop' }

export interface ListenerStatus {
  speaker: Speaker
  ok: boolean
  message?: string
}

export interface LiveSettings {
  language: string
  autoAnswer: boolean
  listenSystem: boolean
  listenMic: boolean
  prompt: string
}
