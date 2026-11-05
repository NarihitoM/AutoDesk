import type { ImageSupport, ModelListResult, ModelOption } from '@/shared/types/models'
import { asArray, asText, pick } from '../../lib/json'
import { getJson, postJson } from '../http'
import { joinUrl } from '../types'
import { listCompatibleModels } from './compatible'
import { guessImages, sortModels, type ModelCatalog } from './types'

interface OllamaModel {
  id: string
  capabilities: unknown
}

function serverRoot(baseUrl: string): string {
  return baseUrl.replace(/\/v1\/?$/, '')
}

function ollamaImages(model: OllamaModel): ImageSupport {
  if (!Array.isArray(model.capabilities)) return guessImages(model.id)
  return asArray(model.capabilities).includes('vision') ? 'yes' : 'no'
}

export function parseOllamaModels(models: OllamaModel[]): ModelListResult {
  return { models: sortModels(models.map((model) => ({ id: model.id, label: model.id, images: ollamaImages(model) }))) }
}

export function parseLmStudioModels(payload: unknown): ModelListResult | null {
  const entries = asArray(pick(payload, 'data'))
  if (!entries.some((item) => typeof pick(item, 'type') === 'string')) return null
  const models = entries.flatMap((item): ModelOption[] => {
    const id = asText(pick(item, 'id'))
    if (!id) return []
    return [{ id, label: id, images: pick(item, 'type') === 'vlm' ? 'yes' : 'no' }]
  })
  return { models: sortModels(models) }
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
  return parseOllamaModels(models)
}

export const listLmStudioModels: ModelCatalog = async (request) => {
  const payload = await getJson(joinUrl(serverRoot(request.baseUrl), 'api/v0/models')).catch(() => null)
  return (payload === null ? null : parseLmStudioModels(payload)) ?? listCompatibleModels(request)
}
