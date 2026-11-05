import type { ModelOption } from '@/shared/types/models'
import { asArray, asText, pick } from '../../lib/json'
import { getJson } from '../http'
import { joinUrl } from '../types'
import type { ModelCatalog } from './types'

const MAX_PAGES = 5
const NOT_VISION_CHAT = /(embedding|aqa|tts|image|imagen|veo|live|native-audio|robotics|computer-use)/

export function parseGeminiModels(payload: unknown): ModelOption[] {
  return asArray(pick(payload, 'models')).flatMap((item) => {
    const id = (asText(pick(item, 'name')) ?? '').replace(/^models\//, '')
    const methods = asArray(pick(item, 'supportedGenerationMethods'))
    if (!id.startsWith('gemini') || NOT_VISION_CHAT.test(id) || !methods.includes('generateContent')) return []
    const name = asText(pick(item, 'displayName'))
    return [{ id, label: name ?? id }]
  })
}

export const listGeminiModels: ModelCatalog = async ({ baseUrl, apiKey }) => {
  const headers: Record<string, string> = apiKey ? { 'x-goog-api-key': apiKey } : {}
  const models: ModelOption[] = []
  let pageToken: string | null = null

  for (let page = 0; page < MAX_PAGES; page++) {
    const query = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
    const payload = await getJson(joinUrl(baseUrl, `v1beta/models?pageSize=1000${query}`), headers)
    models.push(...parseGeminiModels(payload))
    pageToken = asText(pick(payload, 'nextPageToken'))
    if (!pageToken) break
  }

  return { models, visionFilter: 'name-based' }
}
