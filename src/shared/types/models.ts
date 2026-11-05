import type { ProviderId } from './settings'

export type ImageSupport = 'yes' | 'no' | 'unknown'

export interface ModelOption {
  id: string
  label: string
  images: ImageSupport
}

export interface ModelListRequest {
  provider: ProviderId
  baseUrl: string
  apiKey?: string
}

export interface ModelListResult {
  models: ModelOption[]
}

export type ModelListResponse = { ok: true; result: ModelListResult } | { ok: false; error: string }
