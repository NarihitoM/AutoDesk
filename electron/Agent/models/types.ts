import type { ImageSupport, ModelListResult, ModelOption } from '@/shared/types/models'

export interface CatalogRequest {
  baseUrl: string
  apiKey: string | null
}

export type ModelCatalog = (request: CatalogRequest) => Promise<ModelListResult>

const OPEN_VISION_HINT =
  /(llava|vision|[-_.:]vl\b|vl[-_:]|qwen[\d.]*-?vl|moondream|minicpm-v|gemma-?3|pixtral|llama-4|scout|maverick|internvl|mistral-small-?3\.[12]|smolvlm)/i

const IMAGE_RANK: Record<ImageSupport, number> = { yes: 0, unknown: 1, no: 2 }

export function isLikelyVisionModel(id: string): boolean {
  return OPEN_VISION_HINT.test(id)
}

export function guessImages(id: string): ImageSupport {
  return isLikelyVisionModel(id) ? 'yes' : 'unknown'
}

export function byLabel(a: ModelOption, b: ModelOption): number {
  return a.label.localeCompare(b.label, undefined, { numeric: true })
}

export function sortModels(models: ModelOption[]): ModelOption[] {
  return [...models].sort((a, b) => IMAGE_RANK[a.images] - IMAGE_RANK[b.images] || byLabel(a, b))
}

export function bearer(apiKey: string | null): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
}
