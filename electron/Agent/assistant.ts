import { KEY_REQUIRED } from '@/shared/lib/providers'
import type { PanelEvent, PanelState } from '@/shared/types/ipc'
import type { ProviderConfig, ProviderId } from '@/shared/types/settings'
import { getApiKey, getSettings } from '../settings/settingsStore'
import { hidePanel, sendPanelEvent } from '../tools/windows'
import { ChatSession, type ImageRoute, type SessionTarget } from './chatSession'
import { findModel } from './models/cache'
import { providers } from './providers'

let session: ChatSession | null = null

async function resolveRoute(provider: ProviderId, config: ProviderConfig, apiKey: string | null): Promise<ImageRoute> {
  if (!config.model) return { kind: 'direct', fallback: null }
  const { selected, vision } = await findModel(provider, config.baseUrl, apiKey, config.model)
  if (selected?.images === 'yes') return { kind: 'direct', fallback: null }

  const reader = config.imageModel || vision.find((model) => model.id !== config.model)?.id || null
  if (selected?.images === 'no') return reader ? { kind: 'reader', model: reader } : { kind: 'unavailable' }
  return { kind: 'direct', fallback: reader }
}

async function resolveTarget(): Promise<SessionTarget> {
  const { activeProvider, providers: configs } = getSettings()
  const config = configs[activeProvider]
  const apiKey = getApiKey(activeProvider)
  return {
    provider: providers[activeProvider],
    config,
    apiKey,
    keyRequired: KEY_REQUIRED[activeProvider],
    route: await resolveRoute(activeProvider, config, apiKey)
  }
}

export function startSession(png: Buffer): void {
  session?.stop()
  const settings = getSettings()
  const created: ChatSession = new ChatSession(
    { mediaType: 'image/png', base64: png.toString('base64') },
    settings.providers[settings.activeProvider].model,
    (event: PanelEvent) => {
      if (session === created) sendPanelEvent(event)
    }
  )
  session = created
  sendPanelEvent({ type: 'snapshot', state: created.snapshot() })
  void resolveTarget().then((target) => created.ask(settings.prompt, target))
}

export function askFollowUp(text: string): void {
  const current = session
  if (current) void resolveTarget().then((target) => current.ask(text, target))
}

export function stopReply(): void {
  session?.stop()
}

export function currentPanelState(): PanelState | null {
  return session?.snapshot() ?? null
}

export function closeSession(): void {
  session?.stop()
  session = null
  hidePanel()
}
