import { asText, parseJson, pick } from '../../lib/json'
import type { ReasoningLevel } from '@/shared/types/settings'
import { joinUrl, toDataUrl, type ChatTurn, type VisionProvider } from '../types'

function toMessage(turn: ChatTurn): unknown {
  if (!turn.image) return { role: turn.role, content: turn.text }
  return {
    role: turn.role,
    content: [
      { type: 'text', text: turn.text },
      { type: 'image_url', image_url: { url: toDataUrl(turn.image) } }
    ]
  }
}

const OPENAI_HOST = 'api.openai.com'
const OPENROUTER_HOST = 'openrouter.ai'

function tokenLimitField(baseUrl: string): string {
  return new URL(baseUrl).host === OPENAI_HOST ? 'max_completion_tokens' : 'max_tokens'
}

function applyReasoning(body: Record<string, unknown>, baseUrl: string, level: ReasoningLevel | undefined): void {
  if (!level || level === 'default') return
  const effort = level === 'off' ? 'none' : level
  if (new URL(baseUrl).host === OPENROUTER_HOST) {
    body.reasoning = { effort }
  } else {
    body.reasoning_effort = effort
  }
}

export const openAiProvider: VisionProvider = {
  buildRequest(request) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (request.apiKey) headers.Authorization = `Bearer ${request.apiKey}`
    const body: Record<string, unknown> = {
      model: request.model,
      stream: true,
      messages: request.turns.map(toMessage)
    }
    if (request.maxTokens) body[tokenLimitField(request.baseUrl)] = request.maxTokens
    applyReasoning(body, request.baseUrl, request.reasoning)
    return { url: joinUrl(request.baseUrl, 'chat/completions'), headers, body }
  },

  readDelta(data) {
    if (data === '[DONE]') return null
    const payload = parseJson(data)
    const error = asText(pick(payload, 'error', 'message'))
    if (error) throw new Error(error)
    return asText(pick(payload, 'choices', 0, 'delta', 'content'))
  }
}
