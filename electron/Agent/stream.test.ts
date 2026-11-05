import { describe, expect, it } from 'vitest'
import { explainChatFailure } from './stream'

describe('explainChatFailure', () => {
  it('explains when a text-only model rejects the image', () => {
    const groq = '400 Bad Request: messages[0].content must be a string'
    expect(explainChatFailure(400, groq, 'openai/gpt-oss-20b')).toMatch(/^openai\/gpt-oss-20b cannot read images\./)

    const openai = '400 Bad Request: Invalid content type. image_url is only supported by certain models.'
    expect(explainChatFailure(400, openai, 'gpt-3.5-turbo')).toMatch(/cannot read images/)

    const ollama = '500 Internal Server Error: model does not support images'
    expect(explainChatFailure(500, ollama, 'llama3')).toMatch(/^llama3 cannot read images\./)
  })

  it('keeps other errors unchanged', () => {
    const auth = '401 Unauthorized: Invalid API key'
    expect(explainChatFailure(401, auth, 'gpt-5')).toBe(auth)
    const download = '400 Bad Request: Invalid image_url: failed to download the file'
    expect(explainChatFailure(400, download, 'gpt-5')).toBe(download)
    const limit = '429 Too Many Requests: Rate limit reached'
    expect(explainChatFailure(429, limit, 'gpt-5')).toBe(limit)
  })
})
