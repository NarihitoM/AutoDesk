import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app, safeStorage } from 'electron'
import { PROVIDER_IDS } from '@/shared/lib/providers'
import type { ProviderId, Settings, SettingsUpdate, SettingsView } from '@/shared/types/settings'
import { asText, parseJson, pick } from '../lib/json'
import { defaultSettings } from './defaults'
import { sanitizeKeyChanges, sanitizeSettings } from './sanitize'

interface StoredData {
  settings: Settings
  keys: Partial<Record<ProviderId, string>>
}

type SettingsListener = (settings: Settings) => void

let data: StoredData = { settings: defaultSettings(), keys: {} }
const listeners = new Set<SettingsListener>()

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function readStoredData(): StoredData {
  let raw: unknown = null
  try {
    raw = parseJson(readFileSync(settingsPath(), 'utf8'))
  } catch {
    return { settings: defaultSettings(), keys: {} }
  }

  const keys: Partial<Record<ProviderId, string>> = {}
  for (const id of PROVIDER_IDS) {
    const encrypted = asText(pick(raw, 'keys', id))
    if (encrypted) keys[id] = encrypted
  }
  return { settings: sanitizeSettings(pick(raw, 'settings')), keys }
}

function writeStoredData(): void {
  const path = settingsPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 })
}

function applyLoginItem(settings: Settings): void {
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup })
}

export function loadSettings(): void {
  data = readStoredData()
}

export function getSettings(): Settings {
  return data.settings
}

export function getApiKey(id: ProviderId): string | null {
  const encrypted = data.keys[id]
  if (!encrypted) return null
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return null
  }
}

export function getSettingsView(): SettingsView {
  return {
    settings: data.settings,
    storedKeys: {
      openai: Boolean(data.keys.openai),
      anthropic: Boolean(data.keys.anthropic),
      gemini: Boolean(data.keys.gemini),
      compatible: Boolean(data.keys.compatible)
    }
  }
}

export function saveSettings(raw: unknown): SettingsView {
  const update: SettingsUpdate = {
    settings: sanitizeSettings(pick(raw, 'settings')),
    keys: sanitizeKeyChanges(pick(raw, 'keys'))
  }

  const keys = { ...data.keys }
  for (const id of PROVIDER_IDS) {
    const change = update.keys[id]
    if (!change) continue
    if (change.action === 'clear') {
      delete keys[id]
      continue
    }
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Secure storage is not available, so the API key cannot be saved.')
    }
    keys[id] = safeStorage.encryptString(change.value).toString('base64')
  }

  data = { settings: update.settings, keys }
  writeStoredData()
  applyLoginItem(data.settings)
  for (const listener of listeners) listener(data.settings)
  return getSettingsView()
}

export function onSettingsChanged(listener: SettingsListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
