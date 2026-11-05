import { asText, parseJson, pick } from '../../lib/json'
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

export const openAiProvider: VisionProvider = {
  buildRequest(request) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (request.apiKey) headers.Authorization = `Bearer ${request.apiKey}`
    return {
      url: joinUrl(request.baseUrl, 'chat/completions'),
      headers,
      body: {
        model: request.model,
        stream: true,
        messages: request.turns.map(toMessage)
      }
    }
  },

  readDelta(data) {
    if (data === '[DONE]') return null
    const payload = parseJson(data)
    const error = asText(pick(payload, 'error', 'message'))
    if (error) throw new Error(error)
    return asText(pick(payload, 'choices', 0, 'delta', 'content'))
  }
}
