import type { ImageSupport, ModelOption } from '@/shared/types/models'
import { asArray, asText, pick } from '../../lib/json'
import { getJson } from '../http'
import { joinUrl } from '../types'
import { guessImages, sortModels, type ModelCatalog } from './types'

const MAX_PAGES = 5
const NOT_VISION_CHAT = /(embedding|aqa|tts|image|imagen|veo|live|native-audio|robotics|computer-use)/

function geminiImages(id: string, methods: unknown[]): ImageSupport {
  if (!methods.includes('generateContent')) return 'no'
  if (id.startsWith('gemini') && !NOT_VISION_CHAT.test(id)) return 'yes'
  return guessImages(id)
}

export function parseGeminiModels(payload: unknown): ModelOption[] {
  return asArray(pick(payload, 'models')).flatMap((item): ModelOption[] => {
    const id = (asText(pick(item, 'name')) ?? '').replace(/^models\//, '')
    if (!id) return []
    const label = asText(pick(item, 'displayName')) ?? id
    return [{ id, label, images: geminiImages(id, asArray(pick(item, 'supportedGenerationMethods'))) }]
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

  return { models: sortModels(models) }
}
