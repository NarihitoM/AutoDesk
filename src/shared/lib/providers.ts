import type { ModelOption } from '@/shared/types/models'
import type { ModifierKey, ProviderId } from '@/shared/types/settings'

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

const option = (id: string, label = id): ModelOption => ({ id, label })

export const SUGGESTED_MODELS: Record<ProviderId, readonly ModelOption[]> = {
  openai: [
    option('gpt-5', 'GPT-5'),
    option('gpt-5-mini', 'GPT-5 mini'),
    option('gpt-5-nano', 'GPT-5 nano'),
    option('gpt-4.1', 'GPT-4.1'),
    option('gpt-4.1-mini', 'GPT-4.1 mini'),
    option('gpt-4o', 'GPT-4o'),
    option('gpt-4o-mini', 'GPT-4o mini'),
    option('o3', 'o3'),
    option('o4-mini', 'o4-mini')
  ],
  anthropic: [
    option('claude-opus-5-5', 'Claude Opus 5.5'),
    option('claude-sonnet-5-5', 'Claude Sonnet 5.5'),
    option('claude-haiku-5-5', 'Claude Haiku 5.5'),
    option('claude-fable-5-1', 'Claude Fable 5.1'),
    option('claude-opus-5', 'Claude Opus 5')
  ],
  gemini: [
    option('gemini-2.5-pro', 'Gemini 2.5 Pro'),
    option('gemini-2.5-flash', 'Gemini 2.5 Flash'),
    option('gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite'),
    option('gemini-2.0-flash', 'Gemini 2.0 Flash')
  ],
  groq: [
    option('meta-llama/llama-4-scout-17b-16e-instruct', 'Llama 4 Scout'),
    option('meta-llama/llama-4-maverick-17b-128e-instruct', 'Llama 4 Maverick')
  ],
  openrouter: [
    option('google/gemini-2.5-flash', 'Google: Gemini 2.5 Flash'),
    option('google/gemini-2.5-pro', 'Google: Gemini 2.5 Pro'),
    option('openai/gpt-5', 'OpenAI: GPT-5'),
    option('openai/gpt-4o', 'OpenAI: GPT-4o'),
    option('meta-llama/llama-4-scout', 'Meta: Llama 4 Scout')
  ],
  ollama: [
    option('llava'),
    option('llama3.2-vision'),
    option('qwen2.5vl'),
    option('gemma3'),
    option('minicpm-v'),
    option('moondream')
  ],
  lmstudio: [option('qwen2.5-vl-7b-instruct'), option('gemma-3-12b-it')],
  compatible: [option('llava')]
}

export const MODIFIER_KEYS: readonly ModifierKey[] = ['alt', 'ctrl', 'shift']

export const MODIFIER_LABELS: Record<ModifierKey, string> = {
  alt: 'Alt',
  ctrl: 'Ctrl',
  shift: 'Shift'
}
