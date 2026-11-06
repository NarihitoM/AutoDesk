import type { CaptureKey, ModifierKey, ProviderId, ReasoningLevel, ThemeMode } from '@/shared/types/settings'

export const PROVIDER_IDS: readonly ProviderId[] = [
  'openai',
  'anthropic',
  'gemini',
  'groq',
  'openrouter',
  'ollama',
  'lmstudio',
  'compatible'
]

export function byProvider<T>(make: (id: ProviderId) => T): Record<ProviderId, T> {
  return {
    openai: make('openai'),
    anthropic: make('anthropic'),
    gemini: make('gemini'),
    groq: make('groq'),
    openrouter: make('openrouter'),
    ollama: make('ollama'),
    lmstudio: make('lmstudio'),
    compatible: make('compatible')
  }
}

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  gemini: 'Google Gemini',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  compatible: 'Custom (OpenAI-compatible)'
}

export const PROVIDER_SHORT_LABELS: Record<ProviderId, string> = {
  openai: 'OpenAI',
  anthropic: 'Claude',
  gemini: 'Gemini',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  compatible: 'Custom'
}

export const KEY_REQUIRED: Record<ProviderId, boolean> = {
  openai: true,
  anthropic: true,
  gemini: true,
  groq: true,
  openrouter: true,
  ollama: false,
  lmstudio: false,
  compatible: false
}

export const USES_KEY: Record<ProviderId, boolean> = byProvider((id) => id !== 'ollama' && id !== 'lmstudio')

export const KEY_URLS: Partial<Record<ProviderId, string>> = {
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  gemini: 'https://aistudio.google.com/apikey',
  groq: 'https://console.groq.com/keys',
  openrouter: 'https://openrouter.ai/keys'
}

export const CAPTURE_KEYS: readonly CaptureKey[] = ['right-mouse', 'alt', 'ctrl', 'shift']

export const CAPTURE_KEY_LABELS: Record<CaptureKey, string> = {
  'right-mouse': 'Right mouse button',
  alt: 'Alt',
  ctrl: 'Ctrl',
  shift: 'Shift'
}

export const CAPTURE_GESTURES: Record<CaptureKey, string> = {
  'right-mouse': 'Right-click and drag',
  alt: 'Hold Alt + drag',
  ctrl: 'Hold Ctrl + drag',
  shift: 'Hold Shift + drag'
}

export const REASONING_LEVELS: readonly ReasoningLevel[] = ['default', 'off', 'low', 'medium', 'high']

export const REASONING_LABELS: Record<ReasoningLevel, string> = {
  default: 'Default',
  off: 'Off',
  low: 'Low',
  medium: 'Medium',
  high: 'High'
}

export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark']

export const THEME_LABELS: Record<ThemeMode, string> = {
  system: 'Match Windows',
  light: 'Light',
  dark: 'Dark'
}

export const LIVE_HOTKEY = 'CommandOrControl+Shift+Space'

export const LIVE_HOTKEY_LABEL = 'Ctrl+Shift+Space'

export const LIVE_LANGUAGES: readonly (readonly [string, string])[] = [
  ['en', 'English'],
  ['auto', 'Detect automatically'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['de', 'German'],
  ['pt', 'Portuguese'],
  ['it', 'Italian'],
  ['nl', 'Dutch'],
  ['ru', 'Russian'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['zh', 'Chinese'],
  ['hi', 'Hindi'],
  ['ar', 'Arabic'],
  ['id', 'Indonesian'],
  ['vi', 'Vietnamese'],
  ['th', 'Thai']
]

export function modifierOf(key: CaptureKey): ModifierKey | null {
  return key === 'right-mouse' ? null : key
}
