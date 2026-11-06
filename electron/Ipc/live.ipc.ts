import { ipcMain, type WebContents } from 'electron'
import { Channels } from '@/shared/lib/channels'
import type { ListenerStatus } from '@/shared/types/live'
import { liveSession } from '../live/liveSession'
import { asText, pick } from '../lib/json'
import { SAMPLE_RATE } from '../speech/wav'
import {
  closeLiveWindow,
  isListenerSender,
  isLiveSender,
  isSettingsSender,
  openLiveWindow,
  sendLiveEvent
} from '../tools/windows'

const MAX_UTTERANCE_SECONDS = 30
const MAX_PCM_BYTES = SAMPLE_RATE * 2 * MAX_UTTERANCE_SECONDS

function asPcm(value: unknown): Int16Array | null {
  const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : null
  if (!bytes || bytes.byteLength === 0 || bytes.byteLength > MAX_PCM_BYTES || bytes.byteLength % 2 !== 0) return null
  return new Int16Array(bytes.slice().buffer)
}

function asUtteranceId(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
}

function asListenerStatus(value: unknown): ListenerStatus | null {
  const ok = pick(value, 'ok')
  if (typeof ok !== 'boolean') return null
  const message = asText(pick(value, 'message'))?.slice(0, 300)
  return message ? { ok, message } : { ok }
}

function canControl(sender: WebContents): boolean {
  return isLiveSender(sender) || isSettingsSender(sender)
}

function launchLive(): void {
  openLiveWindow(() => liveSession.stop())
  void liveSession.start()
}

export function registerLiveIpc(): void {
  ipcMain.on(Channels.liveReady, (event) => {
    if (isLiveSender(event.sender)) {
      sendLiveEvent({ type: 'snapshot', state: liveSession.snapshot() })
    } else if (isSettingsSender(event.sender)) {
      event.sender.send(Channels.liveEvent, { type: 'status', status: liveSession.snapshot().status })
    }
  })

  ipcMain.on(Channels.liveLaunch, (event) => {
    if (isSettingsSender(event.sender)) launchLive()
  })

  ipcMain.on(Channels.liveStart, (event) => {
    if (isLiveSender(event.sender)) void liveSession.start()
  })

  ipcMain.on(Channels.liveStop, (event) => {
    if (canControl(event.sender)) liveSession.stop()
  })

  ipcMain.on(Channels.liveAsk, (event) => {
    if (isLiveSender(event.sender)) liveSession.ask()
  })

  ipcMain.on(Channels.liveClose, (event) => {
    if (isLiveSender(event.sender)) closeLiveWindow()
  })

  ipcMain.on(Channels.listenerAudio, (event, rawId: unknown, rawPcm: unknown) => {
    if (!isListenerSender(event.sender)) return
    const id = asUtteranceId(rawId)
    const pcm = asPcm(rawPcm)
    if (id && pcm) liveSession.audio(id, pcm)
  })

  ipcMain.on(Channels.listenerPartial, (event, rawId: unknown, rawPcm: unknown) => {
    if (!isListenerSender(event.sender)) return
    const id = asUtteranceId(rawId)
    const pcm = asPcm(rawPcm)
    if (id && pcm) liveSession.partial(id, pcm)
  })

  ipcMain.on(Channels.listenerActivity, (event, speaking: unknown) => {
    if (!isListenerSender(event.sender)) return
    if (typeof speaking === 'boolean') liveSession.activity(speaking)
  })

  ipcMain.on(Channels.listenerStatus, (event, raw: unknown) => {
    if (!isListenerSender(event.sender)) return
    const status = asListenerStatus(raw)
    if (status) liveSession.listenerStatus(status)
  })
}
