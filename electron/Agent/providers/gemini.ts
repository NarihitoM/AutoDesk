import { asText, parseJson, pick } from '../../lib/json'
import { joinUrl, type ChatTurn, type VisionProvider } from '../types'

function toContent(turn: ChatTurn): unknown {
  const parts: unknown[] = []
  if (turn.image) {
    parts.push({ inline_data: { mime_type: turn.image.mediaType, data: turn.image.base64 } })
  }
  parts.push({ text: turn.text })
  return { role: turn.role === 'assistant' ? 'model' : 'user', parts }
}

export const geminiProvider: VisionProvider = {
  buildRequest(request) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (request.apiKey) headers['x-goog-api-key'] = request.apiKey
    const path = `v1beta/models/${encodeURIComponent(request.model)}:streamGenerateContent?alt=sse`
    return {
      url: joinUrl(request.baseUrl, path),
      headers,
      body: { contents: request.turns.map(toContent) }
    }
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
