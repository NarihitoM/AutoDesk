import type { ModelListResult } from '@/shared/types/models'
import { asArray, asText, pick } from '../../lib/json'
import { getJson } from '../http'
import { API_VERSION } from '../providers/anthropic'
import { joinUrl } from '../types'
import type { ModelCatalog } from './types'

export function parseAnthropicModels(payload: unknown): ModelListResult {
  const entries = asArray(pick(payload, 'data')).map((item) => {
    const id = asText(pick(item, 'id')) ?? ''
    const name = asText(pick(item, 'display_name'))
    const imageInput = pick(item, 'capabilities', 'image_input', 'supported')
    return { id, label: name ? `${name} (${id})` : id, imageInput }
  })

  const verified = entries.some((entry) => typeof entry.imageInput === 'boolean')
  return {
    models: entries
      .filter((entry) => entry.id && entry.imageInput !== false)
      .map(({ id, label }) => ({ id, label })),
    visionFilter: verified ? 'verified' : 'name-based'
  }
}

export const listAnthropicModels: ModelCatalog = async ({ baseUrl, apiKey }) => {
  const headers: Record<string, string> = { 'anthropic-version': API_VERSION }
  if (apiKey) headers['x-api-key'] = apiKey
  const payload = await getJson(joinUrl(baseUrl, 'v1/models?limit=1000'), headers)
  return parseAnthropicModels(payload)
}
