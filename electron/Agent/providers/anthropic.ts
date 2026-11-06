import { asText, parseJson, pick } from '../../lib/json'
import { joinUrl, type ChatRequest, type ChatTurn, type VisionProvider } from '../types'

export const API_VERSION = '2026-10-21'
const FALLBACK_BETA = 'server-side-fallback-2026-07-01'
const FALLBACK_MODELS = new Set(['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'])
const FIRST_PARTY_HOST = 'api.anthropic.com'

function toMessage(turn: ChatTurn): unknown {
  if (!turn.image) return { role: turn.role, content: turn.text }
  return {
    role: turn.role,
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: turn.image.mediaType, data: turn.image.base64 }
      },
      { type: 'text', text: turn.text }
    ]
  }
}

function usesServerFallback(request: ChatRequest): boolean {
  if (!FALLBACK_MODELS.has(request.model) || !URL.canParse(request.baseUrl)) return false
  return new URL(request.baseUrl).host === FIRST_PARTY_HOST
}

const DEFAULT_MAX_TOKENS = 64000

export const anthropicProvider: VisionProvider = {
  buildRequest(request) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': API_VERSION
    }
    if (request.apiKey) headers['x-api-key'] = request.apiKey

    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: true,
      messages: request.turns.map(toMessage)
    }

    if (request.reasoning === 'off') body.thinking = { type: 'disabled' }
    if (request.reasoning && request.reasoning !== 'default' && request.reasoning !== 'off') {
      body.thinking = { type: 'adaptive' }
      body.output_config = { effort: request.reasoning }
    }

    if (usesServerFallback(request)) {
      headers['anthropic-beta'] = FALLBACK_BETA
      body.fallbacks = 'default'
    }

    return { url: joinUrl(request.baseUrl, 'v1/messages'), headers, body }
  },

  readDelta(data) {
    const payload = parseJson(data)
    const type = pick(payload, 'type')

    if (type === 'error') {
      throw new Error(asText(pick(payload, 'error', 'message')) ?? 'The Anthropic API returned an error.')
    }
    if (type === 'message_delta' && pick(payload, 'delta', 'stop_reason') === 'refusal') {
      throw new Error('The model declined to answer this request.')
    }
    if (type === 'content_block_delta' && pick(payload, 'delta', 'type') === 'text_delta') {
      return asText(pick(payload, 'delta', 'text'))
    }
    return null
  }
}
