import type { ImageSupport, ModelListResult, ModelOption } from '@/shared/types/models'
import { asArray, asText, pick } from '../../lib/json'
import { fetchModelPages } from './paging'
import { bearer, guessImages, sortModels, type ModelCatalog } from './types'

function imageSupport(id: string, modalities: unknown): ImageSupport {
  if (!Array.isArray(modalities)) return guessImages(id)
  return asArray(modalities).includes('image') ? 'yes' : 'no'
}

export function parseCompatibleModels(items: unknown[]): ModelListResult {
  const models = items.flatMap((item): ModelOption[] => {
    const id = asText(pick(item, 'id'))
    if (!id) return []
    const label = asText(pick(item, 'name')) ?? id
    return [{ id, label, images: imageSupport(id, pick(item, 'architecture', 'input_modalities')) }]
  })
  return { models: sortModels(models) }
}

export const listCompatibleModels: ModelCatalog = async ({ baseUrl, apiKey }) => {
  const items = await fetchModelPages(baseUrl, 'models', bearer(apiKey), 'after')
  return parseCompatibleModels(items)
}
