import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { app, safeStorage, shell } from 'electron'
import { byProvider, PROVIDER_IDS } from '@/shared/lib/providers'
import type { ProviderId, Settings, SettingsUpdate, SettingsView } from '@/shared/types/settings'
import { asText, parseJson, pick } from '../lib/json'
import { defaultSettings } from './defaults'
import { sanitizeKeyChanges, sanitizeSettings } from './sanitize'

type StoredKeys = Partial<Record<ProviderId, string>>
type SettingsListener = (settings: Settings) => void

const ENCRYPTED_PREFIX = 'dpapi:'

export const DATA_DIRECTORY = join(homedir(), '.autodesk')
const SETTINGS_FILE = join(DATA_DIRECTORY, 'settings.json')
const CREDENTIALS_FILE = join(DATA_DIRECTORY, 'credentials.json')

let settings: Settings = defaultSettings()
let keys: StoredKeys = {}
const listeners = new Set<SettingsListener>()

function readJsonFile(path: string): unknown {
  if (!existsSync(path)) return null
  try {
    return parseJson(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function writeJsonFile(path: string, value: unknown): void {
  mkdirSync(DATA_DIRECTORY, { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
}

function encrypt(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure storage is not available, so the API key cannot be saved.')
  }
  return ENCRYPTED_PREFIX + safeStorage.encryptString(value).toString('base64')
}

function readKeys(raw: unknown, legacyEncrypted: boolean): { keys: StoredKeys; changed: boolean } {
  const result: StoredKeys = {}
  let changed = false
  for (const id of PROVIDER_IDS) {
    const value = asText(pick(raw, id))?.trim()
    if (!value) continue
    if (value.startsWith(ENCRYPTED_PREFIX)) {
      result[id] = value
    } else if (legacyEncrypted) {
      result[id] = ENCRYPTED_PREFIX + value
      changed = true
    } else if (safeStorage.isEncryptionAvailable()) {
      result[id] = encrypt(value)
      changed = true
    } else {
      result[id] = value
    }
  }
  return { keys: result, changed }
}

function persist(): void {
  writeJsonFile(SETTINGS_FILE, settings)
  writeJsonFile(CREDENTIALS_FILE, keys)
}

function applyLoginItem(next: Settings): void {
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: next.launchAtStartup })
}

export function loadSettings(): void {
  mkdirSync(DATA_DIRECTORY, { recursive: true })

  let rawSettings = readJsonFile(SETTINGS_FILE)
  let rawKeys = readJsonFile(CREDENTIALS_FILE)
  let legacyEncrypted = false

  if (rawSettings === null && rawKeys === null) {
    const legacy = readJsonFile(join(app.getPath('userData'), 'settings.json'))
    rawSettings = pick(legacy, 'settings') ?? null
    rawKeys = pick(legacy, 'keys') ?? null
    legacyEncrypted = rawKeys !== null
  }

  const loaded = readKeys(rawKeys, legacyEncrypted)
  settings = sanitizeSettings(rawSettings)
  keys = loaded.keys

  if (!existsSync(SETTINGS_FILE) || !existsSync(CREDENTIALS_FILE) || loaded.changed) persist()
}

export function getSettings(): Settings {
  return settings
}

export function getApiKey(id: ProviderId): string | null {
  const stored = keys[id]
  if (!stored) return null
  if (!stored.startsWith(ENCRYPTED_PREFIX)) return stored
  try {
    return safeStorage.decryptString(Buffer.from(stored.slice(ENCRYPTED_PREFIX.length), 'base64'))
  } catch {
    return null
  }
}

export function getSettingsView(): SettingsView {
  return {
    settings,
    storedKeys: byProvider((id) => Boolean(keys[id])),
    dataDirectory: DATA_DIRECTORY
  }
}

export function saveSettings(raw: unknown): SettingsView {
  const update: SettingsUpdate = {
    settings: sanitizeSettings(pick(raw, 'settings')),
    keys: sanitizeKeyChanges(pick(raw, 'keys'))
  }

  const nextKeys = { ...keys }
  for (const id of PROVIDER_IDS) {
    const change = update.keys[id]
    if (!change) continue
    if (change.action === 'clear') delete nextKeys[id]
    else nextKeys[id] = encrypt(change.value)
  }

  settings = update.settings
  keys = nextKeys
  persist()
  applyLoginItem(settings)
  for (const listener of listeners) listener(settings)
  return getSettingsView()
}

export function openDataDirectory(): Promise<string> {
  mkdirSync(DATA_DIRECTORY, { recursive: true })
  return shell.openPath(DATA_DIRECTORY)
}

export function onSettingsChanged(listener: SettingsListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
