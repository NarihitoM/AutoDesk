import type { ModelListResult, ModelOption } from '@/shared/types/models'
import { asArray, asText, pick } from '../../lib/json'
import { getJson, postJson } from '../http'
import { joinUrl } from '../types'
import { listCompatibleModels } from './compatible'
import { byLabel, isLikelyVisionModel, type ModelCatalog } from './types'

interface OllamaModel {
  id: string
  capabilities: unknown
}

function serverRoot(baseUrl: string): string {
  return baseUrl.replace(/\/v1\/?$/, '')
}

export function pickOllamaVisionModels(models: OllamaModel[]): ModelListResult {
  const reported = models.some((model) => Array.isArray(model.capabilities))
  const options: ModelOption[] = models
    .filter((model) =>
      reported ? asArray(model.capabilities).includes('vision') : isLikelyVisionModel(model.id)
    )
    .map(({ id }) => ({ id, label: id }))
  return { models: options.sort(byLabel), visionFilter: reported ? 'verified' : 'name-based' }
}

export function parseLmStudioModels(payload: unknown): ModelListResult | null {
  const entries = asArray(pick(payload, 'data'))
  if (!entries.some((item) => typeof pick(item, 'type') === 'string')) return null
  const models = entries.flatMap((item) => {
    const id = asText(pick(item, 'id'))
    return id && pick(item, 'type') === 'vlm' ? [{ id, label: id }] : []
  })
  return { models: models.sort(byLabel), visionFilter: 'verified' }
}

export const listOllamaModels: ModelCatalog = async ({ baseUrl }) => {
  const root = serverRoot(baseUrl)
  const tags = await getJson(joinUrl(root, 'api/tags'))
  const names = asArray(pick(tags, 'models')).flatMap((item) => {
    const name = asText(pick(item, 'model')) ?? asText(pick(item, 'name'))
    return name ? [name] : []
  })

  const models = await Promise.all(
    names.map(async (id): Promise<OllamaModel> => {
      try {
        const info = await postJson(joinUrl(root, 'api/show'), { model: id })
        return { id, capabilities: pick(info, 'capabilities') }
      } catch {
        return { id, capabilities: undefined }
      }
    })
  )
  return pickOllamaVisionModels(models)
}

export const listLmStudioModels: ModelCatalog = async (request) => {
  const payload = await getJson(joinUrl(serverRoot(request.baseUrl), 'api/v0/models')).catch(() => null)
  return (payload === null ? null : parseLmStudioModels(payload)) ?? listCompatibleModels(request)
}
