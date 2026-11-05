import { describeFailure } from './http'
import { SseParser } from './sse'
import type { ChatRequest, VisionProvider } from './types'

const NO_IMAGE_SUPPORT =
  /content must be a string|image_url[^.]*only supported|(image|vision|multimodal)[^.]*(not supported|unsupported|does not support|doesn't support)|(not support|does not support|doesn't support|unsupported)[^.]*(image|vision)/i

const IGNORED_STATUSES = new Set([401, 403, 429])

export function explainChatFailure(status: number, failure: string, model: string): string {
  if (!IGNORED_STATUSES.has(status) && NO_IMAGE_SUPPORT.test(failure)) {
    return `${model} cannot read images. Open Settings and choose a vision model, such as one with "vision", "vl", or "llama-4" in its name.`
  }
  return failure
}

export async function* streamChat(
  provider: VisionProvider,
  request: ChatRequest,
  signal: AbortSignal
): AsyncGenerator<string> {
  const http = provider.buildRequest(request)
  const response = await fetch(http.url, {
    method: 'POST',
    headers: http.headers,
    body: JSON.stringify(http.body),
    signal
  })

  if (!response.ok) {
    throw new Error(explainChatFailure(response.status, await describeFailure(response), request.model))
  }
  if (!response.body) throw new Error('The provider returned an empty response.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const events: string[] = []
  const parser = new SseParser((data) => events.push(data))

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      parser.push(decoder.decode())
      parser.end()
    } else {
      parser.push(decoder.decode(value, { stream: true }))
    }

    for (const data of events.splice(0)) {
      const delta = provider.readDelta(data)
      if (delta) yield delta
    }

    if (done) return
  }
}
