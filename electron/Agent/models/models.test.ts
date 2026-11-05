import { describe, expect, it } from 'vitest'
import { parseAnthropicModels } from './anthropic'
import { parseCompatibleModels } from './compatible'
import { parseGeminiModels } from './gemini'
import { parseLmStudioModels, parseOllamaModels } from './local'
import { isOpenAiVisionModel, parseOpenAiModels } from './openai'
import { isLikelyVisionModel } from './types'

const summary = (models: { id: string; images: string }[]): string[] =>
  models.map((model) => `${model.id}:${model.images}`)

describe('OpenAI model list', () => {
  it.each(['gpt-5', 'gpt-5-mini', 'gpt-4.1', 'gpt-4o-mini', 'o3', 'o4-mini', 'chatgpt-4o-latest'])(
    'recognises %s as able to read images',
    (id) => expect(isOpenAiVisionModel(id)).toBe(true)
  )

  it.each(['gpt-3.5-turbo', 'o1-mini', 'o3-mini', 'gpt-4o-audio-preview', 'gpt-image-1', 'whisper-1'])(
    'does not treat %s as able to read images',
    (id) => expect(isOpenAiVisionModel(id)).toBe(false)
  )

  it('keeps every model and lists image models first', () => {
    const models = parseOpenAiModels([{ id: 'gpt-3.5-turbo' }, { id: 'davinci-002' }, { id: 'gpt-5' }, { id: 'ft:custom' }])
    expect(summary(models)).toEqual(['gpt-5:yes', 'ft:custom:unknown', 'davinci-002:no', 'gpt-3.5-turbo:no'])
  })
})

describe('Anthropic model list', () => {
  it('marks image support from capabilities and keeps every model', () => {
    const { models } = parseAnthropicModels([
      { id: 'claude-text-only', display_name: 'Text', capabilities: { image_input: { supported: false } } },
      { id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5', capabilities: { image_input: { supported: true } } },
      { id: 'claude-old' }
    ])
    expect(summary(models)).toEqual(['claude-opus-5-5:yes', 'claude-old:unknown', 'claude-text-only:no'])
  })
})

describe('Gemini model list', () => {
  it('keeps every model and marks chat models that read images', () => {
    const models = parseGeminiModels({
      models: [
        { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] },
        { name: 'models/gemma-3-27b-it', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }
      ]
    })
    expect(summary(models)).toEqual([
      'gemini-2.5-flash:yes',
      'gemini-embedding-001:no',
      'gemma-3-27b-it:yes',
      'gemini-2.5-flash-preview-tts:unknown'
    ])
  })
})

describe('OpenAI-compatible model list', () => {
  it('uses input modalities when present and keeps text-only models', () => {
    const { models } = parseCompatibleModels([
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek: R1', architecture: { input_modalities: ['text'] } },
      { id: 'google/gemini-2.5-flash', name: 'Google: Gemini 2.5 Flash', architecture: { input_modalities: ['text', 'image'] } }
    ])
    expect(summary(models)).toEqual(['google/gemini-2.5-flash:yes', 'deepseek/deepseek-r1:no'])
  })

  it('falls back to model names and keeps everything', () => {
    const { models } = parseCompatibleModels([
      { id: 'llama-3.3-70b-versatile' },
      { id: 'meta-llama/llama-4-scout-17b-16e-instruct' },
      { id: 'mistral-medium-3.5' }
    ])
    expect(summary(models)).toEqual([
      'meta-llama/llama-4-scout-17b-16e-instruct:yes',
      'llama-3.3-70b-versatile:unknown',
      'mistral-medium-3.5:unknown'
    ])
  })
})

describe('local model lists', () => {
  it('uses Ollama capabilities when reported', () => {
    const { models } = parseOllamaModels([
      { id: 'llama3.2:latest', capabilities: ['completion', 'tools'] },
      { id: 'qwen2.5vl:7b', capabilities: ['completion', 'vision'] },
      { id: 'llava:latest', capabilities: undefined }
    ])
    expect(summary(models)).toEqual(['llava:latest:yes', 'qwen2.5vl:7b:yes', 'llama3.2:latest:no'])
  })

  it('keeps every LM Studio model and marks vlm types', () => {
    const result = parseLmStudioModels({
      data: [
        { id: 'llama-3.2-3b-instruct', type: 'llm' },
        { id: 'qwen2.5-vl-7b-instruct', type: 'vlm' }
      ]
    })
    expect(summary(result?.models ?? [])).toEqual(['qwen2.5-vl-7b-instruct:yes', 'llama-3.2-3b-instruct:no'])
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
