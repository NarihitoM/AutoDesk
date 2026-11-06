import type { Settings } from '@/shared/types/settings'

export const DEFAULT_PROMPT =
  'Look at this screenshot and help me with it. Explain what it shows, and if it contains a question, error, or task, answer or solve it. Be concise.'

export const DEFAULT_LIVE_PROMPT =
  "You are my live assistant. Each message is speech transcribed from my computer's audio, such as a call, interview, meeting, or video. Reply to the latest message like a chat assistant. If it asks a question, answer it the way I could say it out loud. Keep it natural and concise, in a short paragraph or 2 to 4 short bullet points."

export function defaultSettings(): Settings {
  return {
    activeProvider: 'anthropic',
    providers: {
      openai: { model: '', imageModel: '', baseUrl: 'https://api.openai.com/v1', reasoning: 'default' },
      anthropic: { model: '', imageModel: '', baseUrl: 'https://api.anthropic.com', reasoning: 'default' },
      gemini: { model: '', imageModel: '', baseUrl: 'https://generativelanguage.googleapis.com', reasoning: 'default' },
      groq: { model: '', imageModel: '', baseUrl: 'https://api.groq.com/openai/v1', reasoning: 'default' },
      openrouter: { model: '', imageModel: '', baseUrl: 'https://openrouter.ai/api/v1', reasoning: 'default' },
      ollama: { model: '', imageModel: '', baseUrl: 'http://localhost:11434/v1', reasoning: 'off' },
      lmstudio: { model: '', imageModel: '', baseUrl: 'http://localhost:1234/v1', reasoning: 'default' },
      compatible: { model: '', imageModel: '', baseUrl: 'http://localhost:8000/v1', reasoning: 'default' }
    },
    prompt: DEFAULT_PROMPT,
    captureKey: 'right-mouse',
    launchAtStartup: false,
    theme: 'system',
    live: {
      language: 'en',
      autoAnswer: true,
      prompt: DEFAULT_LIVE_PROMPT
    }
  }
}
