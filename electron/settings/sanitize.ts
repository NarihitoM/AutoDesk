import { MODIFIER_KEYS, PROVIDER_IDS } from '@/shared/lib/providers'
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
    model: nonEmptyText(pick(raw, 'model'), fallback.model),
    baseUrl: nonEmptyText(pick(raw, 'baseUrl'), fallback.baseUrl).replace(/\/+$/, '')
  }
}

export function sanitizeSettings(raw: unknown): Settings {
  const defaults = defaultSettings()
  const providers = pick(raw, 'providers')
  return {
    activeProvider: oneOf(pick(raw, 'activeProvider'), PROVIDER_IDS, defaults.activeProvider),
    providers: {
      openai: sanitizeProvider(pick(providers, 'openai'), defaults.providers.openai),
      anthropic: sanitizeProvider(pick(providers, 'anthropic'), defaults.providers.anthropic),
      gemini: sanitizeProvider(pick(providers, 'gemini'), defaults.providers.gemini),
      compatible: sanitizeProvider(pick(providers, 'compatible'), defaults.providers.compatible)
    },
    prompt: nonEmptyText(pick(raw, 'prompt'), defaults.prompt),
    modifier: oneOf(pick(raw, 'modifier'), MODIFIER_KEYS, defaults.modifier),
    launchAtStartup: pick(raw, 'launchAtStartup') === true
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
