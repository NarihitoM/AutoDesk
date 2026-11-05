import type { ImageSupport, ModelOption } from '@/shared/types/models'
import { asText, pick } from '../../lib/json'
import { fetchModelPages } from './paging'
import { bearer, sortModels, type ModelCatalog } from './types'

const VISION_FAMILY = /^(gpt-5|gpt-4\.1|gpt-4\.5|gpt-4o|chatgpt-4o|gpt-4-turbo|o1|o3|o4)/
const NOT_VISION_CHAT = /(audio|realtime|transcribe|tts|search|embedding|image|moderation|instruct|codex|computer-use|deep-research)/
const TEXT_ONLY = /^(o1-mini|o1-preview|o3-mini|gpt-3\.5|text-embedding|whisper|tts|dall-e|davinci|babbage|omni-moderation)/

export function isOpenAiVisionModel(id: string): boolean {
  return VISION_FAMILY.test(id) && !NOT_VISION_CHAT.test(id) && !TEXT_ONLY.test(id)
}

function openAiImages(id: string): ImageSupport {
  if (isOpenAiVisionModel(id)) return 'yes'
  if (TEXT_ONLY.test(id)) return 'no'
  return 'unknown'
}

export function parseOpenAiModels(items: unknown[]): ModelOption[] {
  const models = items.flatMap((item): ModelOption[] => {
    const id = asText(pick(item, 'id'))
    return id ? [{ id, label: id, images: openAiImages(id) }] : []
  })
  return sortModels(models)
}

export const listOpenAiModels: ModelCatalog = async ({ baseUrl, apiKey }) => {
  const items = await fetchModelPages(baseUrl, 'models', bearer(apiKey), 'after')
  return { models: parseOpenAiModels(items) }
}
