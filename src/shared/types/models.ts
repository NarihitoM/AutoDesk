import type { ProviderId } from './settings'

export type VisionFilter = 'verified' | 'name-based' | 'none'

export interface ModelOption {
  id: string
  label: string
}

export interface ModelListRequest {
  provider: ProviderId
  baseUrl: string
  apiKey?: string
}

export interface ModelListResult {
  models: ModelOption[]
  visionFilter: VisionFilter
}
