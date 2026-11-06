import type { ChatRole } from '@/shared/types/ipc'

export interface ChatImage {
  mediaType: 'image/png'
  base64: string
}

export interface ChatTurn {
  role: ChatRole
  text: string
  image?: ChatImage
}

export interface ChatRequest {
  model: string
  baseUrl: string
  apiKey: string | null
  turns: ChatTurn[]
  maxTokens?: number
}

export interface HttpRequest {
  url: string
  headers: Record<string, string>
  body: unknown
}

export interface VisionProvider {
  buildRequest(request: ChatRequest): HttpRequest
  readDelta(data: string): string | null
}

export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path}`
}

export function toDataUrl(image: ChatImage): string {
  return `data:${image.mediaType};base64,${image.base64}`
}
