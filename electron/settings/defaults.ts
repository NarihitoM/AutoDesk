import type { Settings } from '@/shared/types/settings'

export const DEFAULT_PROMPT =
  'Look at this screenshot and help me with it. Explain what it shows, and if it contains a question, error, or task, answer or solve it. Be concise.'

export const DEFAULT_LIVE_PROMPT =
  'You are helping me during a live conversation. Read the transcript and suggest what I should say in reply to the latest question. Answer in the first person, naturally and concisely, in a short paragraph or 2 to 4 short bullet points.'

export function defaultSettings(): Settings {
  return {
    activeProvider: 'anthropic',
    providers: {
      openai: { model: '', imageModel: '', baseUrl: 'https://api.openai.com/v1' },
      anthropic: { model: '', imageModel: '', baseUrl: 'https://api.anthropic.com' },
      gemini: { model: '', imageModel: '', baseUrl: 'https://generativelanguage.googleapis.com' },
      groq: { model: '', imageModel: '', baseUrl: 'https://api.groq.com/openai/v1' },
      openrouter: { model: '', imageModel: '', baseUrl: 'https://openrouter.ai/api/v1' },
      ollama: { model: '', imageModel: '', baseUrl: 'http://localhost:11434/v1' },
      lmstudio: { model: '', imageModel: '', baseUrl: 'http://localhost:1234/v1' },
      compatible: { model: '', imageModel: '', baseUrl: 'http://localhost:8000/v1' }
    },
    prompt: DEFAULT_PROMPT,
    captureKey: 'right-mouse',
    launchAtStartup: false,
    theme: 'system',
    live: {
      language: 'en',
      autoAnswer: true,
      listenSystem: true,
      listenMic: true,
      prompt: DEFAULT_LIVE_PROMPT
    }
  }
}
