import type { ModelListResult, ModelOption } from '@/shared/types/models'
import { asArray, asText, pick } from '../../lib/json'
import { getJson } from '../http'
import { joinUrl } from '../types'
import { bearer, byLabel, isLikelyVisionModel, type ModelCatalog } from './types'

export function parseCompatibleModels(payload: unknown): ModelListResult {
  const entries = asArray(pick(payload, 'data')).flatMap((item) => {
    const id = asText(pick(item, 'id'))
    if (!id) return []
    const modalities = pick(item, 'architecture', 'input_modalities')
    return [{ id, label: asText(pick(item, 'name')) ?? id, modalities }]
  })
  const toOption = ({ id, label }: ModelOption): ModelOption => ({ id, label })

  if (entries.some((entry) => Array.isArray(entry.modalities))) {
    const models = entries.filter((entry) => asArray(entry.modalities).includes('image')).map(toOption)
    return { models: models.sort(byLabel), visionFilter: 'verified' }
  }

  const likely = entries.filter((entry) => isLikelyVisionModel(entry.id)).map(toOption)
  if (likely.length > 0) return { models: likely.sort(byLabel), visionFilter: 'name-based' }

  return { models: entries.map(toOption).sort(byLabel), visionFilter: 'none' }
}

export const listCompatibleModels: ModelCatalog = async ({ baseUrl, apiKey }) => {
  const payload = await getJson(joinUrl(baseUrl, 'models'), bearer(apiKey))
  return parseCompatibleModels(payload)
}
