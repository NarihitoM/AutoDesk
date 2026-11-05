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

export interface ProviderConfig {
  model: string
  baseUrl: string
}

export interface Settings {
  activeProvider: ProviderId
  providers: Record<ProviderId, ProviderConfig>
  prompt: string
  modifier: ModifierKey
  launchAtStartup: boolean
}

export interface SettingsView {
  settings: Settings
  storedKeys: Record<ProviderId, boolean>
}

export type KeyChange = { action: 'set'; value: string } | { action: 'clear' }

export interface SettingsUpdate {
  settings: Settings
  keys: Partial<Record<ProviderId, KeyChange>>
}
