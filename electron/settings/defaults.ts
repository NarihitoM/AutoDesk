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
      groq: { model: 'meta-llama/llama-4-scout-17b-16e-instruct', baseUrl: 'https://api.groq.com/openai/v1' },
      openrouter: { model: 'google/gemini-2.5-flash', baseUrl: 'https://openrouter.ai/api/v1' },
      ollama: { model: 'llava', baseUrl: 'http://localhost:11434/v1' },
      lmstudio: { model: 'qwen2.5-vl-7b-instruct', baseUrl: 'http://localhost:1234/v1' },
      compatible: { model: 'llava', baseUrl: 'http://localhost:8000/v1' }
    },
    prompt: DEFAULT_PROMPT,
    modifier: 'alt',
    launchAtStartup: false
  }
}
