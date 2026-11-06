import type { ListenerCommand, ListenerStatus, LiveEvent, Speaker } from './live'
import type { ModelListRequest, ModelListResponse } from './models'
import type { SettingsUpdate, SettingsView } from './settings'

export interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}

export type ChatRole = 'user' | 'assistant'

export interface PanelMessage {
  id: string
  role: ChatRole
  text: string
  note?: string
  error?: string
}

export interface PanelState {
  sessionId: string
  image: string
  model: string
  messages: PanelMessage[]
  streaming: boolean
}

export type PanelEvent =
  | { type: 'snapshot'; state: PanelState }
  | { type: 'message'; message: PanelMessage }
  | { type: 'note'; messageId: string; note: string }
  | { type: 'delta'; messageId: string; text: string }
  | { type: 'done'; messageId: string; error?: string }

export type Unsubscribe = () => void

export interface AutoDeskApi {
  overlay: {
    onReset(listener: () => void): Unsubscribe
    onSelection(listener: (rect: SelectionRect) => void): Unsubscribe
    begin(): void
    select(rect: SelectionRect): void
    cancel(): void
  }
  panel: {
    onEvent(listener: (event: PanelEvent) => void): Unsubscribe
    ready(): void
    ask(text: string): void
    stop(): void
    close(): void
  }
  settings: {
    get(): Promise<SettingsView>
    save(update: SettingsUpdate): Promise<SettingsView>
    listModels(request: ModelListRequest): Promise<ModelListResponse>
    openDataFolder(): void
    setDirty(dirty: boolean): void
    onSaveRequest(listener: () => void): Unsubscribe
    close(): void
  }
  live: {
    onEvent(listener: (event: LiveEvent) => void): Unsubscribe
    ready(): void
    start(): void
    stop(): void
    ask(): void
    close(): void
  }
  listener: {
    onCommand(listener: (command: ListenerCommand) => void): Unsubscribe
    sendAudio(speaker: Speaker, pcm: ArrayBuffer): void
    reportStatus(status: ListenerStatus): void
  }
}
