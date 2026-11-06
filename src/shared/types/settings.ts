import type { LiveSettings } from './live'

export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'ollama'
  | 'lmstudio'
  | 'compatible'

export type ModifierKey = 'alt' | 'ctrl' | 'shift'

export type CaptureKey = 'right-mouse' | ModifierKey

export type ThemeMode = 'system' | 'light' | 'dark'

export interface ProviderConfig {
  model: string
  imageModel: string
  baseUrl: string
}

export interface Settings {
  activeProvider: ProviderId
  providers: Record<ProviderId, ProviderConfig>
  prompt: string
  captureKey: CaptureKey
  launchAtStartup: boolean
  theme: ThemeMode
  live: LiveSettings
}

export interface SettingsView {
  settings: Settings
  storedKeys: Record<ProviderId, boolean>
  dataDirectory: string
}

export type KeyChange = { action: 'set'; value: string } | { action: 'clear' }

export interface SettingsUpdate {
  settings: Settings
  keys: Partial<Record<ProviderId, KeyChange>>
}
