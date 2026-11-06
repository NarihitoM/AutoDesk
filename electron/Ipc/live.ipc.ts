import { ipcMain, type WebContents } from 'electron'
import { Channels } from '@/shared/lib/channels'
import type { ListenerStatus, Speaker } from '@/shared/types/live'
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

function asSpeaker(value: unknown): Speaker | null {
  return value === 'them' || value === 'you' ? value : null
}

function asPcm(value: unknown): Int16Array | null {
  const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : null
  if (!bytes || bytes.byteLength === 0 || bytes.byteLength > MAX_PCM_BYTES || bytes.byteLength % 2 !== 0) return null
  return new Int16Array(bytes.slice().buffer)
}

function asListenerStatus(value: unknown): ListenerStatus | null {
  const speaker = asSpeaker(pick(value, 'speaker'))
  const ok = pick(value, 'ok')
  if (!speaker || typeof ok !== 'boolean') return null
  const message = asText(pick(value, 'message'))?.slice(0, 300)
  return message ? { speaker, ok, message } : { speaker, ok }
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

  ipcMain.on(Channels.listenerAudio, (event, rawSpeaker: unknown, rawPcm: unknown) => {
    if (!isListenerSender(event.sender)) return
    const speaker = asSpeaker(rawSpeaker)
    const pcm = asPcm(rawPcm)
    if (speaker && pcm) liveSession.audio(speaker, pcm)
  })

  ipcMain.on(Channels.listenerStatus, (event, raw: unknown) => {
    if (!isListenerSender(event.sender)) return
    const status = asListenerStatus(raw)
    if (status) liveSession.listenerStatus(status)
  })
}
