import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const paths = vi.hoisted(() => ({ home: '', userData: '' }))

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>()
  return { ...actual, homedir: () => paths.home }
})

vi.mock('electron', () => ({
  app: {
    getPath: () => paths.userData,
    isPackaged: false,
    setLoginItemSettings: vi.fn()
  },
  safeStorage: {
    isAsyncEncryptionAvailable: () => Promise.resolve(true),
    encryptStringAsync: (value: string) => Promise.resolve(Buffer.from(`sealed:${value}`)),
    decryptStringAsync: (buffer: Buffer) =>
      Promise.resolve({ result: buffer.toString().replace(/^sealed:/, ''), shouldReEncrypt: false })
  },
  shell: { openPath: vi.fn() }
}))

async function loadStore() {
  vi.resetModules()
  const store = await import('./settingsStore')
  await store.loadSettings()
  return store
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

describe('settingsStore', () => {
  let root = ''

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'autodesk-test-'))
    paths.home = join(root, 'home')
    paths.userData = join(root, 'userData')
    mkdirSync(paths.home)
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('creates the .autodesk folder with default files on first start', async () => {
    const store = await loadStore()
    const folder = join(paths.home, '.autodesk')
    expect(store.DATA_DIRECTORY).toBe(folder)
    expect(existsSync(join(folder, 'settings.json'))).toBe(true)
    expect(readJson(join(folder, 'credentials.json'))).toEqual({})
    expect(store.getSettings().activeProvider).toBe('anthropic')
  })

  it('stores API keys encrypted and reads them back', async () => {
    const store = await loadStore()
    await store.saveSettings({ settings: store.getSettings(), keys: { groq: { action: 'set', value: 'gsk_secret' } } })

    const raw = readFileSync(join(paths.home, '.autodesk', 'credentials.json'), 'utf8')
    expect(raw).not.toContain('gsk_secret')
    expect(raw).toContain('"groq": "dpapi:')
    expect(store.getApiKey('groq')).toBe('gsk_secret')

    const reloaded = await loadStore()
    expect(reloaded.getApiKey('groq')).toBe('gsk_secret')
    expect(reloaded.getSettingsView().storedKeys.groq).toBe(true)
  })

  it('removes a key when it is cleared', async () => {
    const store = await loadStore()
    await store.saveSettings({ settings: store.getSettings(), keys: { openai: { action: 'set', value: 'sk-1' } } })
    await store.saveSettings({ settings: store.getSettings(), keys: { openai: { action: 'clear' } } })
    expect(store.getApiKey('openai')).toBeNull()
    expect(readJson(join(paths.home, '.autodesk', 'credentials.json'))).toEqual({})
  })

  it('encrypts a key typed by hand into credentials.json', async () => {
    const folder = join(paths.home, '.autodesk')
    mkdirSync(folder)
    writeFileSync(join(folder, 'credentials.json'), JSON.stringify({ openai: 'sk-typed-by-hand' }))

    const store = await loadStore()
    expect(store.getApiKey('openai')).toBe('sk-typed-by-hand')
    expect(readFileSync(join(folder, 'credentials.json'), 'utf8')).not.toContain('sk-typed-by-hand')
  })

  it('moves settings and keys from the old app data location', async () => {
    mkdirSync(paths.userData)
    const legacyKey = Buffer.from('sealed:sk-ant-old').toString('base64')
    writeFileSync(
      join(paths.userData, 'settings.json'),
      JSON.stringify({ settings: { activeProvider: 'gemini', modifier: 'ctrl' }, keys: { anthropic: legacyKey } })
    )

    const store = await loadStore()
    expect(store.getSettings().activeProvider).toBe('gemini')
    expect(store.getSettings().modifier).toBe('ctrl')
    expect(store.getApiKey('anthropic')).toBe('sk-ant-old')
    expect(existsSync(join(paths.home, '.autodesk', 'settings.json'))).toBe(true)
  })
})
