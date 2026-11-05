import type { Settings } from '@/shared/types/settings'

export const DEFAULT_PROMPT =
  'Look at this screenshot and help me with it. Explain what it shows, and if it contains a question, error, or task, answer or solve it. Be concise.'

export function defaultSettings(): Settings {
  return {
    activeProvider: 'anthropic',
    providers: {
      openai: { model: 'gpt-5', baseUrl: 'https://api.openai.com/v1' },
      anthropic: { model: 'claude-opus-5-5', baseUrl: 'https://api.anthropic.com' },
      gemini: { model: 'gemini-2.5-flash', baseUrl: 'https://generativelanguage.googleapis.com' },
      compatible: { model: 'llava', baseUrl: 'http://localhost:11434/v1' }
    },
    prompt: DEFAULT_PROMPT,
    modifier: 'alt',
    launchAtStartup: false
  }
}
