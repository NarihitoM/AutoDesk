import type { ModelOption } from '@/shared/types/models'
import { asArray, asNumber, asText, pick } from '../../lib/json'
import { getJson } from '../http'
import { joinUrl } from '../types'
import { bearer, type ModelCatalog } from './types'

const VISION_FAMILY = /^(gpt-5|gpt-4\.1|gpt-4\.5|gpt-4o|chatgpt-4o|gpt-4-turbo|o1|o3|o4)/
const NOT_CHAT = /(audio|realtime|transcribe|tts|search|embedding|image|moderation|instruct|codex|computer-use|deep-research)/
const NO_IMAGE_INPUT = /^(o1-mini|o1-preview|o3-mini)/

export function isOpenAiVisionModel(id: string): boolean {
  return VISION_FAMILY.test(id) && !NOT_CHAT.test(id) && !NO_IMAGE_INPUT.test(id)
}

export function parseOpenAiModels(payload: unknown): ModelOption[] {
  return asArray(pick(payload, 'data'))
    .map((item) => ({ id: asText(pick(item, 'id')) ?? '', created: asNumber(pick(item, 'created')) ?? 0 }))
    .filter((model) => model.id && isOpenAiVisionModel(model.id))
    .sort((a, b) => b.created - a.created || a.id.localeCompare(b.id))
    .map(({ id }) => ({ id, label: id }))
}

export const listOpenAiModels: ModelCatalog = async ({ baseUrl, apiKey }) => {
  const payload = await getJson(joinUrl(baseUrl, 'models'), bearer(apiKey))
  return { models: parseOpenAiModels(payload), visionFilter: 'name-based' }
}
