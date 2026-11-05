import type { ModifierKey, ProviderId } from '@/shared/types/settings'

export const PROVIDER_IDS: readonly ProviderId[] = ['openai', 'anthropic', 'gemini', 'compatible']

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  gemini: 'Google Gemini',
  compatible: 'Ollama / OpenAI-compatible'
}

export const KEY_REQUIRED: Record<ProviderId, boolean> = {
  openai: true,
  anthropic: true,
  gemini: true,
  compatible: false
}

export const MODIFIER_KEYS: readonly ModifierKey[] = ['alt', 'ctrl', 'shift']

export const MODIFIER_LABELS: Record<ModifierKey, string> = {
  alt: 'Alt',
  ctrl: 'Ctrl',
  shift: 'Shift'
}
