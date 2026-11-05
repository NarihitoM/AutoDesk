import type { ModelListResult, ModelOption } from '@/shared/types/models'
import type { ProviderId } from '@/shared/types/settings'
import { modelCatalogs } from '.'

const CACHE_MS = 10 * 60 * 1000

interface CacheEntry {
  at: number
  result: ModelListResult
}

const cache = new Map<string, CacheEntry>()

function cacheKey(provider: ProviderId, baseUrl: string, apiKey: string | null): string {
  return `${provider}|${baseUrl}|${apiKey ?? ''}`
}

export async function loadModels(
  provider: ProviderId,
  baseUrl: string,
  apiKey: string | null,
  fresh = false
): Promise<ModelListResult> {
  const key = cacheKey(provider, baseUrl, apiKey)
  const cached = cache.get(key)
  if (!fresh && cached && Date.now() - cached.at < CACHE_MS) return cached.result

  const result = await modelCatalogs[provider]({ baseUrl, apiKey })
  cache.set(key, { at: Date.now(), result })
  return result
}

export async function findModel(
  provider: ProviderId,
  baseUrl: string,
  apiKey: string | null,
  id: string
): Promise<{ selected: ModelOption | null; vision: ModelOption[] }> {
  try {
    const { models } = await loadModels(provider, baseUrl, apiKey)
    return {
      selected: models.find((model) => model.id === id) ?? null,
      vision: models.filter((model) => model.images === 'yes')
    }
  } catch {
    return { selected: null, vision: [] }
  }
}
