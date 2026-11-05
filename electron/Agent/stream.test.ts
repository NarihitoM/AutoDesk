import { describe, expect, it } from 'vitest'
import { explainChatFailure, ImageNotSupportedError } from './stream'

describe('explainChatFailure', () => {
  it('flags a text-only model that rejects the image', () => {
    const cases: [number, string, string][] = [
      [400, '400 Bad Request: messages[0].content must be a string', 'openai/gpt-oss-20b'],
      [400, '400 Bad Request: Invalid content type. image_url is only supported by certain models.', 'gpt-3.5-turbo'],
      [500, '500 Internal Server Error: model does not support images', 'llama3']
    ]
    for (const [status, failure, model] of cases) {
      const error = explainChatFailure(status, failure, model)
      expect(error).toBeInstanceOf(ImageNotSupportedError)
      expect(error.message.startsWith(`${model} cannot read images.`)).toBe(true)
    }
  })

  it('keeps other errors unchanged', () => {
    const cases: [number, string][] = [
      [401, '401 Unauthorized: Invalid API key'],
      [400, '400 Bad Request: Invalid image_url: failed to download the file'],
      [429, '429 Too Many Requests: Rate limit reached']
    ]
    for (const [status, failure] of cases) {
      const error = explainChatFailure(status, failure, 'gpt-5')
      expect(error).not.toBeInstanceOf(ImageNotSupportedError)
      expect(error.message).toBe(failure)
    }
  })
})
