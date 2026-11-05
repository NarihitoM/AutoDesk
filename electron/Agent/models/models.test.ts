import { describe, expect, it } from 'vitest'
import { parseAnthropicModels } from './anthropic'
import { parseCompatibleModels } from './compatible'
import { parseGeminiModels } from './gemini'
import { parseLmStudioModels, pickOllamaVisionModels } from './local'
import { isOpenAiVisionModel, parseOpenAiModels } from './openai'
import { isLikelyVisionModel } from './types'

const ids = (models: { id: string }[]): string[] => models.map((model) => model.id)

describe('OpenAI model list', () => {
  it.each(['gpt-5', 'gpt-5-mini', 'gpt-4.1', 'gpt-4o-mini', 'o3', 'o4-mini', 'chatgpt-4o-latest'])(
    'keeps vision model %s',
    (id) => expect(isOpenAiVisionModel(id)).toBe(true)
  )

  it.each([
    'gpt-3.5-turbo',
    'o1-mini',
    'o3-mini',
    'gpt-4o-audio-preview',
    'gpt-4o-realtime-preview',
    'gpt-4o-mini-tts',
    'gpt-image-1',
    'text-embedding-3-large',
    'whisper-1',
    'omni-moderation-latest',
    'gpt-5-codex'
  ])('drops non-vision model %s', (id) => expect(isOpenAiVisionModel(id)).toBe(false))

  it('sorts newest first', () => {
    const payload = {
      data: [
        { id: 'gpt-4o', created: 100 },
        { id: 'whisper-1', created: 300 },
        { id: 'gpt-5', created: 200 }
      ]
    }
    expect(ids(parseOpenAiModels(payload))).toEqual(['gpt-5', 'gpt-4o'])
  })
})

describe('Anthropic model list', () => {
  it('uses the image_input capability when present', () => {
    const result = parseAnthropicModels({
      data: [
        { id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5', capabilities: { image_input: { supported: true } } },
        { id: 'claude-text-only', display_name: 'Text', capabilities: { image_input: { supported: false } } }
      ]
    })
    expect(result.visionFilter).toBe('verified')
    expect(result.models).toEqual([{ id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (claude-opus-5-5)' }])
  })

  it('keeps every model when capabilities are missing', () => {
    const result = parseAnthropicModels({ data: [{ id: 'claude-a' }, { id: 'claude-b' }] })
    expect(result.visionFilter).toBe('name-based')
    expect(ids(result.models)).toEqual(['claude-a', 'claude-b'])
  })
})

describe('Gemini model list', () => {
  it('keeps chat-capable Gemini models and drops the rest', () => {
    const payload = {
      models: [
        { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] },
        { name: 'models/gemini-2.5-flash-image', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/imagen-4.0-generate-001', supportedGenerationMethods: ['predict'] },
        { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }
      ]
    }
    expect(parseGeminiModels(payload)).toEqual([
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (gemini-2.5-flash)' }
    ])
  })
})

describe('OpenAI-compatible model list', () => {
  it('uses OpenRouter input modalities when present', () => {
    const result = parseCompatibleModels({
      data: [
        { id: 'google/gemini-2.5-flash', name: 'Google: Gemini 2.5 Flash', architecture: { input_modalities: ['text', 'image'] } },
        { id: 'deepseek/deepseek-r1', name: 'DeepSeek: R1', architecture: { input_modalities: ['text'] } }
      ]
    })
    expect(result.visionFilter).toBe('verified')
    expect(ids(result.models)).toEqual(['google/gemini-2.5-flash'])
  })

  it('falls back to model names, as on Groq', () => {
    const result = parseCompatibleModels({
      data: [
        { id: 'meta-llama/llama-4-scout-17b-16e-instruct' },
        { id: 'llama-3.3-70b-versatile' },
        { id: 'whisper-large-v3' }
      ]
    })
    expect(result.visionFilter).toBe('name-based')
    expect(ids(result.models)).toEqual(['meta-llama/llama-4-scout-17b-16e-instruct'])
  })

  it('shows everything when nothing looks like a vision model', () => {
    const result = parseCompatibleModels({ data: [{ id: 'model-b' }, { id: 'model-a' }] })
    expect(result.visionFilter).toBe('none')
    expect(ids(result.models)).toEqual(['model-a', 'model-b'])
  })
})

describe('local model lists', () => {
  it('uses Ollama capabilities when reported', () => {
    const result = pickOllamaVisionModels([
      { id: 'llama3.2:latest', capabilities: ['completion', 'tools'] },
      { id: 'qwen2.5vl:7b', capabilities: ['completion', 'vision'] }
    ])
    expect(result.visionFilter).toBe('verified')
    expect(ids(result.models)).toEqual(['qwen2.5vl:7b'])
  })

  it('falls back to names on older Ollama versions', () => {
    const result = pickOllamaVisionModels([
      { id: 'llava:latest', capabilities: undefined },
      { id: 'mistral:latest', capabilities: undefined }
    ])
    expect(result.visionFilter).toBe('name-based')
    expect(ids(result.models)).toEqual(['llava:latest'])
  })

  it('keeps only LM Studio models of type vlm', () => {
    const result = parseLmStudioModels({
      data: [
        { id: 'qwen2.5-vl-7b-instruct', type: 'vlm' },
        { id: 'llama-3.2-3b-instruct', type: 'llm' },
        { id: 'nomic-embed-text', type: 'embeddings' }
      ]
    })
    expect(result?.visionFilter).toBe('verified')
    expect(ids(result?.models ?? [])).toEqual(['qwen2.5-vl-7b-instruct'])
  })

  it('returns null when the LM Studio response has no types', () => {
    expect(parseLmStudioModels({ data: [{ id: 'x' }] })).toBeNull()
  })

  it.each(['llava:13b', 'qwen2.5vl:7b', 'Qwen2.5-VL-7B', 'gemma3:12b', 'llama3.2-vision', 'minicpm-v'])(
    'recognises %s as a vision model by name',
    (id) => expect(isLikelyVisionModel(id)).toBe(true)
  )

  it.each(['llama3.1:8b', 'mistral:7b', 'deepseek-r1', 'phi4'])('does not match %s', (id) =>
    expect(isLikelyVisionModel(id)).toBe(false)
  )
})
