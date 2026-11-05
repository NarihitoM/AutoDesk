import type { ProviderId } from '@/shared/types/settings'
import { listAnthropicModels } from './anthropic'
import { listCompatibleModels } from './compatible'
import { listGeminiModels } from './gemini'
import { listLmStudioModels, listOllamaModels } from './local'
import { listOpenAiModels } from './openai'
import type { ModelCatalog } from './types'

export const modelCatalogs: Record<ProviderId, ModelCatalog> = {
  openai: listOpenAiModels,
  anthropic: listAnthropicModels,
  gemini: listGeminiModels,
  groq: listCompatibleModels,
  openrouter: listCompatibleModels,
  ollama: listOllamaModels,
  lmstudio: listLmStudioModels,
  compatible: listCompatibleModels
}
