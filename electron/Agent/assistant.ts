import { KEY_REQUIRED } from '@/shared/lib/providers'
import type { PanelEvent, PanelState } from '@/shared/types/ipc'
import { getApiKey, getSettings } from '../settings/settingsStore'
import { hidePanel, sendPanelEvent } from '../tools/windows'
import { ChatSession, type SessionTarget } from './chatSession'
import { providers } from './providers'

let session: ChatSession | null = null

function resolveTarget(): SessionTarget {
  const { activeProvider, providers: configs } = getSettings()
  return {
    provider: providers[activeProvider],
    config: configs[activeProvider],
    apiKey: getApiKey(activeProvider),
    keyRequired: KEY_REQUIRED[activeProvider]
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
  void created.ask(settings.prompt, resolveTarget())
}

export function askFollowUp(text: string): void {
  void session?.ask(text, resolveTarget())
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
