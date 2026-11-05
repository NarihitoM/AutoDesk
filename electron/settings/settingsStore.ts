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
let secrets: StoredKeys = {}
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

async function encrypt(value: string): Promise<string> {
  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new Error('Secure storage is not available, so the API key cannot be saved.')
  }
  const sealed = await safeStorage.encryptStringAsync(value)
  return ENCRYPTED_PREFIX + sealed.toString('base64')
}

async function decrypt(stored: string): Promise<{ value: string; reseal: boolean } | null> {
  try {
    const sealed = Buffer.from(stored.slice(ENCRYPTED_PREFIX.length), 'base64')
    const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(sealed)
    return { value: result, reseal: shouldReEncrypt }
  } catch {
    return null
  }
}

async function readKeys(raw: unknown, legacyEncrypted: boolean): Promise<boolean> {
  const canEncrypt = await safeStorage.isAsyncEncryptionAvailable()
  let changed = false
  keys = {}
  secrets = {}

  for (const id of PROVIDER_IDS) {
    const text = asText(pick(raw, id))?.trim()
    if (!text) continue

    const stored = legacyEncrypted && !text.startsWith(ENCRYPTED_PREFIX) ? ENCRYPTED_PREFIX + text : text
    if (stored !== text) changed = true

    if (!stored.startsWith(ENCRYPTED_PREFIX)) {
      secrets[id] = stored
      keys[id] = canEncrypt ? await encrypt(stored) : stored
      changed ||= canEncrypt
      continue
    }

    const opened = await decrypt(stored)
    keys[id] = stored
    if (!opened) continue
    secrets[id] = opened.value
    if (opened.reseal && canEncrypt) {
      keys[id] = await encrypt(opened.value)
      changed = true
    }
  }

  return changed
}

function persist(): void {
  writeJsonFile(SETTINGS_FILE, settings)
  writeJsonFile(CREDENTIALS_FILE, keys)
}

function applyLoginItem(next: Settings): void {
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: next.launchAtStartup })
}

export async function loadSettings(): Promise<void> {
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

  settings = sanitizeSettings(rawSettings)
  const changed = await readKeys(rawKeys, legacyEncrypted)

  if (!existsSync(SETTINGS_FILE) || !existsSync(CREDENTIALS_FILE) || changed) persist()
}

export function getSettings(): Settings {
  return settings
}

export function getApiKey(id: ProviderId): string | null {
  return secrets[id] ?? null
}

export function getSettingsView(): SettingsView {
  return {
    settings,
    storedKeys: byProvider((id) => Boolean(keys[id])),
    dataDirectory: DATA_DIRECTORY
  }
}

export async function saveSettings(raw: unknown): Promise<SettingsView> {
  const update: SettingsUpdate = {
    settings: sanitizeSettings(pick(raw, 'settings')),
    keys: sanitizeKeyChanges(pick(raw, 'keys'))
  }

  const nextKeys = { ...keys }
  const nextSecrets = { ...secrets }
  for (const id of PROVIDER_IDS) {
    const change = update.keys[id]
    if (!change) continue
    if (change.action === 'clear') {
      delete nextKeys[id]
      delete nextSecrets[id]
    } else {
      nextKeys[id] = await encrypt(change.value)
      nextSecrets[id] = change.value
    }
  }

  settings = update.settings
  keys = nextKeys
  secrets = nextSecrets
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
