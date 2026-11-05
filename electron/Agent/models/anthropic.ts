import type { ImageSupport, ModelListResult, ModelOption } from '@/shared/types/models'
import { asText, pick } from '../../lib/json'
import { API_VERSION } from '../providers/anthropic'
import { fetchModelPages } from './paging'
import { sortModels, type ModelCatalog } from './types'

function imageSupport(value: unknown): ImageSupport {
  if (value === true) return 'yes'
  if (value === false) return 'no'
  return 'unknown'
}

export function parseAnthropicModels(items: unknown[]): ModelListResult {
  const models = items.flatMap((item): ModelOption[] => {
    const id = asText(pick(item, 'id'))
    if (!id) return []
    const label = asText(pick(item, 'display_name')) ?? id
    return [{ id, label, images: imageSupport(pick(item, 'capabilities', 'image_input', 'supported')) }]
  })
  return { models: sortModels(models) }
}

export const listAnthropicModels: ModelCatalog = async ({ baseUrl, apiKey }) => {
  const headers: Record<string, string> = { 'anthropic-version': API_VERSION }
  if (apiKey) headers['x-api-key'] = apiKey
  const items = await fetchModelPages(baseUrl, 'v1/models?limit=1000', headers, 'after_id')
  return parseAnthropicModels(items)
}
