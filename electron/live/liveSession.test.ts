import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LiveEvent, TranscriptLine } from '@/shared/types/live'

const mocks = vi.hoisted(() => ({
  events: [] as LiveEvent[],
  transcripts: [] as string[],
  prompts: [] as string[]
}))

vi.mock('electron', () => ({
  globalShortcut: { isRegistered: () => false, register: vi.fn(), unregister: vi.fn() }
}))

vi.mock('../tools/windows', () => ({
  sendLiveEvent: (event: LiveEvent) => mocks.events.push(event),
  sendListenerCommand: vi.fn()
}))

vi.mock('../speech/whisperServer', () => ({
  whisperServer: {
    start: () => Promise.resolve(),
    stop: vi.fn(),
    transcribe: () => Promise.resolve(mocks.transcripts.shift() ?? '')
  }
}))

vi.mock('../settings/settingsStore', () => ({
  getApiKey: () => 'key',
  getSettings: () => ({
    activeProvider: 'groq',
    providers: { groq: { model: 'test-model', imageModel: '', baseUrl: 'https://example.com/v1', reasoning: 'default' } },
    live: { language: 'en', autoAnswer: true, prompt: 'Help me.' }
  })
}))

vi.mock('../Agent/stream', () => ({
  streamChat: async function* (_provider: unknown, request: { turns: { text: string }[] }) {
    mocks.prompts.push(request.turns[0]?.text ?? '')
    yield 'Sure.'
  }
}))

const pcm = new Int16Array(160)

function lines(): TranscriptLine[] {
  const latest = new Map<string, TranscriptLine>()
  for (const event of mocks.events) if (event.type === 'line') latest.set(event.line.id, event.line)
  return [...latest.values()]
}

async function settle(): Promise<void> {
  for (let index = 0; index < 5; index++) await vi.advanceTimersByTimeAsync(0)
}

async function loadSession() {
  vi.resetModules()
  const { liveSession } = await import('./liveSession')
  await liveSession.start()
  return liveSession
}

describe('liveSession turns', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.events.length = 0
    mocks.transcripts.length = 0
    mocks.prompts.length = 0
  })

  afterEach(() => vi.useRealTimers())

  it('keeps one bubble while they keep talking and replies once after a pause', async () => {
    const session = await loadSession()
    mocks.transcripts.push('All right, the cars are taking off.', 'First day, you know?')

    session.activity(true)
    session.audio(1, pcm)
    await settle()
    session.activity(true)
    await vi.advanceTimersByTimeAsync(3000)
    session.audio(2, pcm)
    await settle()

    expect(lines()).toHaveLength(1)
    expect(lines()[0]?.text).toBe('All right, the cars are taking off. First day, you know?')
    expect(lines()[0]?.open).toBe(true)
    expect(mocks.prompts).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(1600)
    await settle()
    expect(lines()[0]?.open).toBe(false)
    expect(mocks.prompts).toHaveLength(1)
    expect(mocks.prompts[0]).toContain('Latest message: All right, the cars are taking off. First day, you know?')
    session.stop()
  })

  it('starts a new bubble after a pause', async () => {
    const session = await loadSession()
    mocks.transcripts.push('First question?', 'Second question?')

    session.audio(1, pcm)
    await settle()
    await vi.advanceTimersByTimeAsync(1600)
    session.audio(2, pcm)
    await settle()

    expect(lines().map((line) => line.text)).toEqual(['First question?', 'Second question?'])
    session.stop()
  })

  it('does not end the turn while a discarded click is followed by more speech', async () => {
    const session = await loadSession()
    mocks.transcripts.push('Tell me about yourself.')

    session.audio(1, pcm)
    await settle()
    session.activity(true)
    await vi.advanceTimersByTimeAsync(5000)
    expect(mocks.prompts).toHaveLength(0)

    session.activity(false)
    await vi.advanceTimersByTimeAsync(1600)
    await settle()
    expect(mocks.prompts).toHaveLength(1)
    session.stop()
  })
})
