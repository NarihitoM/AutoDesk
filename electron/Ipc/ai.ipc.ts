import { ipcMain } from 'electron'
import { Channels } from '@/shared/lib/channels'
import { askFollowUp, closeSession, currentPanelState, stopReply } from '../Agent/assistant'
import { isPanelSender, sendPanelEvent } from '../tools/windows'

export function registerAiIpc(): void {
  ipcMain.on(Channels.panelReady, (event) => {
    if (!isPanelSender(event.sender)) return
    const state = currentPanelState()
    if (state) sendPanelEvent({ type: 'snapshot', state })
  })

  ipcMain.on(Channels.panelAsk, (event, raw: unknown) => {
    if (!isPanelSender(event.sender) || typeof raw !== 'string') return
    const text = raw.trim()
    if (text) askFollowUp(text)
  })

  ipcMain.on(Channels.panelStop, (event) => {
    if (isPanelSender(event.sender)) stopReply()
  })

  ipcMain.on(Channels.panelClose, (event) => {
    if (isPanelSender(event.sender)) closeSession()
  })
}
