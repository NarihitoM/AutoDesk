import { byProvider, CAPTURE_KEYS, LIVE_LANGUAGES, PROVIDER_IDS, THEME_MODES } from '@/shared/lib/providers'
import type { ModelListRequest } from '@/shared/types/models'
import type { LiveSettings } from '@/shared/types/live'
import type { KeyChange, ProviderConfig, ProviderId, Settings } from '@/shared/types/settings'
import { asText, pick } from '../lib/json'
import { defaultSettings } from './defaults'

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.find((option) => option === value) ?? fallback
}

function nonEmptyText(value: unknown, fallback: string): string {
  const text = asText(value)?.trim()
  return text ? text : fallback
}

function sanitizeProvider(raw: unknown, fallback: ProviderConfig): ProviderConfig {
  return {
    model: asText(pick(raw, 'model'))?.trim() ?? fallback.model,
    imageModel: asText(pick(raw, 'imageModel'))?.trim() ?? fallback.imageModel,
    baseUrl: nonEmptyText(pick(raw, 'baseUrl'), fallback.baseUrl).replace(/\/+$/, '')
  }
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function sanitizeLive(raw: unknown, fallback: LiveSettings): LiveSettings {
  const languages = LIVE_LANGUAGES.map(([code]) => code)
  return {
    language: oneOf(pick(raw, 'language'), languages, fallback.language),
    autoAnswer: flag(pick(raw, 'autoAnswer'), fallback.autoAnswer),
    prompt: nonEmptyText(pick(raw, 'prompt'), fallback.prompt)
  }
}

export function sanitizeSettings(raw: unknown): Settings {
  const defaults = defaultSettings()
  const providers = pick(raw, 'providers')
  return {
    activeProvider: oneOf(pick(raw, 'activeProvider'), PROVIDER_IDS, defaults.activeProvider),
    providers: byProvider((id) => sanitizeProvider(pick(providers, id), defaults.providers[id])),
    prompt: nonEmptyText(pick(raw, 'prompt'), defaults.prompt),
    captureKey: oneOf(pick(raw, 'captureKey'), CAPTURE_KEYS, defaults.captureKey),
    launchAtStartup: pick(raw, 'launchAtStartup') === true,
    theme: oneOf(pick(raw, 'theme'), THEME_MODES, defaults.theme),
    live: sanitizeLive(pick(raw, 'live'), defaults.live)
  }
}

export function sanitizeKeyChanges(raw: unknown): Partial<Record<ProviderId, KeyChange>> {
  const changes: Partial<Record<ProviderId, KeyChange>> = {}
  for (const id of PROVIDER_IDS) {
    const action = pick(raw, id, 'action')
    const value = asText(pick(raw, id, 'value'))?.trim()
    if (action === 'clear') changes[id] = { action: 'clear' }
    if (action === 'set' && value) changes[id] = { action: 'set', value }
  }
  return changes
}

export function sanitizeModelListRequest(raw: unknown): ModelListRequest {
  const provider = PROVIDER_IDS.find((id) => id === pick(raw, 'provider'))
  if (!provider) throw new Error('Unknown provider.')

  const baseUrl = asText(pick(raw, 'baseUrl'))?.trim().replace(/\/+$/, '') ?? ''
  if (!URL.canParse(baseUrl) || !/^https?:$/.test(new URL(baseUrl).protocol)) {
    throw new Error('Enter a valid base URL that starts with http:// or https://.')
  }

  const apiKey = asText(pick(raw, 'apiKey'))?.trim()
  return apiKey ? { provider, baseUrl, apiKey } : { provider, baseUrl }
}
