import type { ProviderId } from '@/shared/types/settings'
import type { VisionProvider } from '../types'
import { anthropicProvider } from './anthropic'
import { geminiProvider } from './gemini'
import { openAiProvider } from './openai'

export const providers: Record<ProviderId, VisionProvider> = {
  openai: openAiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  groq: openAiProvider,
  openrouter: openAiProvider,
  ollama: openAiProvider,
  lmstudio: openAiProvider,
  compatible: openAiProvider
}
