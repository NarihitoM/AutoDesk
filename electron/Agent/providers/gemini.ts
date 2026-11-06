import { asText, parseJson, pick } from '../../lib/json'
import type { ReasoningLevel } from '@/shared/types/settings'
import { joinUrl, type ChatTurn, type VisionProvider } from '../types'

function toContent(turn: ChatTurn): unknown {
  const parts: unknown[] = []
  if (turn.image) {
    parts.push({ inline_data: { mime_type: turn.image.mediaType, data: turn.image.base64 } })
  }
  parts.push({ text: turn.text })
  return { role: turn.role === 'assistant' ? 'model' : 'user', parts }
}

const THINKING_BUDGETS: Record<Exclude<ReasoningLevel, 'default'>, number> = {
  off: 0,
  low: 1024,
  medium: 8192,
  high: 24576
}

function generationConfig(maxTokens: number | undefined, reasoning: ReasoningLevel | undefined): Record<string, unknown> | null {
  const config: Record<string, unknown> = {}
  if (maxTokens) config.maxOutputTokens = maxTokens
  if (reasoning && reasoning !== 'default') config.thinkingConfig = { thinkingBudget: THINKING_BUDGETS[reasoning] }
  return Object.keys(config).length > 0 ? config : null
}

export const geminiProvider: VisionProvider = {
  buildRequest(request) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (request.apiKey) headers['x-goog-api-key'] = request.apiKey
    const path = `v1beta/models/${encodeURIComponent(request.model)}:streamGenerateContent?alt=sse`
    const body: Record<string, unknown> = { contents: request.turns.map(toContent) }
    const config = generationConfig(request.maxTokens, request.reasoning)
    if (config) body.generationConfig = config
    return { url: joinUrl(request.baseUrl, path), headers, body }
  },

  readDelta(data) {
    const payload = parseJson(data)
    const error = asText(pick(payload, 'error', 'message'))
    if (error) throw new Error(error)

    const blocked = asText(pick(payload, 'promptFeedback', 'blockReason'))
    if (blocked) throw new Error(`Gemini blocked this request (${blocked}).`)

    const parts = pick(payload, 'candidates', 0, 'content', 'parts')
    if (!Array.isArray(parts)) return null
    return parts.map((part: unknown) => asText(pick(part, 'text')) ?? '').join('')
  }
}
