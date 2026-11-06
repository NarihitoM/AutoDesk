import { describe, expect, it } from 'vitest'
import type { ChatRequest } from '../types'
import { anthropicProvider } from './anthropic'
import { geminiProvider } from './gemini'
import { openAiProvider } from './openai'

const image = { mediaType: 'image/png' as const, base64: 'AAAA' }

function request(overrides: Partial<ChatRequest> = {}): ChatRequest {
  return {
    model: 'test-model',
    baseUrl: 'https://example.com/v1/',
    apiKey: 'secret',
    turns: [
      { role: 'user', text: 'What is this?', image },
      { role: 'assistant', text: 'A chart.' },
      { role: 'user', text: 'Explain more' }
    ],
    ...overrides
  }
}

describe('openAiProvider', () => {
  it('builds a chat completions request with a data URL image', () => {
    const http = openAiProvider.buildRequest(request())
    expect(http.url).toBe('https://example.com/v1/chat/completions')
    expect(http.headers.Authorization).toBe('Bearer secret')
    expect(http.body).toEqual({
      model: 'test-model',
      stream: true,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is this?' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } }
          ]
        },
        { role: 'assistant', content: 'A chart.' },
        { role: 'user', content: 'Explain more' }
      ]
    })
  })

  it('limits output tokens with the field each server expects', () => {
    expect(openAiProvider.buildRequest(request({ maxTokens: 500 })).body).toMatchObject({ max_tokens: 500 })
    const openAi = openAiProvider.buildRequest(request({ maxTokens: 500, baseUrl: 'https://api.openai.com/v1' }))
    expect(openAi.body).toMatchObject({ max_completion_tokens: 500 })
    expect(openAi.body).not.toHaveProperty('max_tokens')
  })

  it('asks the server to skip reasoning when requested', () => {
    expect(openAiProvider.buildRequest(request({ skipReasoning: true })).body).toMatchObject({ reasoning_effort: 'none' })
    expect(openAiProvider.buildRequest(request()).body).not.toHaveProperty('reasoning_effort')
  })

  it('omits the auth header without a key', () => {
    const http = openAiProvider.buildRequest(request({ apiKey: null }))
    expect(http.headers.Authorization).toBeUndefined()
  })

  it('reads deltas, the done marker and errors', () => {
    expect(openAiProvider.readDelta('{"choices":[{"delta":{"content":"Hi"}}]}')).toBe('Hi')
    expect(openAiProvider.readDelta('{"choices":[{"delta":{}}]}')).toBeNull()
    expect(openAiProvider.readDelta('[DONE]')).toBeNull()
    expect(() => openAiProvider.readDelta('{"error":{"message":"bad key"}}')).toThrow('bad key')
  })
})

describe('anthropicProvider', () => {
  it('builds a messages request with a base64 image block', () => {
    const http = anthropicProvider.buildRequest(request({ baseUrl: 'https://proxy.example.com' }))
    expect(http.url).toBe('https://proxy.example.com/v1/messages')
    expect(http.headers['x-api-key']).toBe('secret')
    expect(http.headers['anthropic-version']).toBe('2026-10-21')
    expect(http.headers['anthropic-beta']).toBeUndefined()
    expect(http.body).toMatchObject({
      model: 'test-model',
      stream: true,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } },
            { type: 'text', text: 'What is this?' }
          ]
        },
        { role: 'assistant', content: 'A chart.' },
        { role: 'user', content: 'Explain more' }
      ]
    })
  })

  it('enables server-side fallbacks for supported models on the first-party API', () => {
    const http = anthropicProvider.buildRequest(
      request({ model: 'claude-opus-5-5', baseUrl: 'https://api.anthropic.com' })
    )
    expect(http.headers['anthropic-beta']).toBe('server-side-fallback-2026-07-01')
    expect(http.body).toMatchObject({ fallbacks: 'default' })
  })

  it('uses the requested output token limit', () => {
    expect(anthropicProvider.buildRequest(request({ maxTokens: 500 })).body).toMatchObject({ max_tokens: 500 })
  })

  it('reads text deltas and ignores other events', () => {
    const delta = '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}'
    expect(anthropicProvider.readDelta(delta)).toBe('Hello')
    expect(anthropicProvider.readDelta('{"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":""}}')).toBeNull()
    expect(anthropicProvider.readDelta('{"type":"message_stop"}')).toBeNull()
  })

  it('surfaces errors and refusals', () => {
    expect(() => anthropicProvider.readDelta('{"type":"error","error":{"message":"Overloaded"}}')).toThrow('Overloaded')
    expect(() => anthropicProvider.readDelta('{"type":"message_delta","delta":{"stop_reason":"refusal"}}')).toThrow(
      'declined'
    )
  })
})

describe('geminiProvider', () => {
  it('builds a streamGenerateContent request with inline image data', () => {
    const http = geminiProvider.buildRequest(
      request({ model: 'gemini-test', baseUrl: 'https://generativelanguage.googleapis.com' })
    )
    expect(http.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:streamGenerateContent?alt=sse'
    )
    expect(http.headers['x-goog-api-key']).toBe('secret')
    expect(http.body).toEqual({
      contents: [
        {
          role: 'user',
          parts: [{ inline_data: { mime_type: 'image/png', data: 'AAAA' } }, { text: 'What is this?' }]
        },
        { role: 'model', parts: [{ text: 'A chart.' }] },
        { role: 'user', parts: [{ text: 'Explain more' }] }
      ]
    })
  })

  it('limits output tokens when asked', () => {
    expect(geminiProvider.buildRequest(request({ maxTokens: 500 })).body).toMatchObject({
      generationConfig: { maxOutputTokens: 500 }
    })
  })

  it('joins text parts and surfaces errors', () => {
    const chunk = '{"candidates":[{"content":{"parts":[{"text":"Hel"},{"text":"lo"}]}}]}'
    expect(geminiProvider.readDelta(chunk)).toBe('Hello')
    expect(() => geminiProvider.readDelta('{"error":{"message":"quota"}}')).toThrow('quota')
    expect(() => geminiProvider.readDelta('{"promptFeedback":{"blockReason":"SAFETY"}}')).toThrow('SAFETY')
  })
})
