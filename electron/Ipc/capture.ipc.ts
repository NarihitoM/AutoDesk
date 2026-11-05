import { dialog, ipcMain } from 'electron'
import { Channels } from '@/shared/lib/channels'
import type { SelectionRect } from '@/shared/types/ipc'
import { startSession } from '../Agent/assistant'
import { pick } from '../lib/json'
import { getSettings } from '../settings/settingsStore'
import type { CaptureTrigger } from '../tools/captureTrigger'
import { suppressAltMenu } from '../tools/inputHook'
import { captureRegion } from '../tools/screenCapture'
import {
  getOverlayDisplay,
  hideOverlay,
  hidePanelForCapture,
  isOverlaySender,
  restorePanel,
  showPanelNear
} from '../tools/windows'

const MIN_SELECTION = 4

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseRect(raw: unknown): SelectionRect | null {
  const x = finite(pick(raw, 'x'))
  const y = finite(pick(raw, 'y'))
  const width = finite(pick(raw, 'width'))
  const height = finite(pick(raw, 'height'))
  if (x === null || y === null || width === null || height === null) return null
  if (width < MIN_SELECTION || height < MIN_SELECTION) return null
  return { x, y, width, height }
}

function cancelCapture(trigger: CaptureTrigger): void {
  trigger.reset()
  hideOverlay()
  restorePanel()
}

async function completeCapture(trigger: CaptureTrigger, rect: SelectionRect | null): Promise<void> {
  const display = getOverlayDisplay()
  if (trigger.current !== 'dragging' || !rect || !display) {
    cancelCapture(trigger)
    return
  }

  trigger.reset()
  hideOverlay()

  try {
    const image = await captureRegion(display, rect)
    showPanelNear(display, rect)
    startSession(image.toPNG())
  } catch (error) {
    restorePanel()
    const message = error instanceof Error ? error.message : 'Unknown error'
    dialog.showErrorBox('AutoDesk', `Screen capture failed.\n\n${message}`)
  }
}

export function registerCaptureIpc(trigger: CaptureTrigger): void {
  ipcMain.on(Channels.overlayBegin, (event) => {
    if (!isOverlaySender(event.sender) || !trigger.beginDrag()) return
    if (getSettings().modifier === 'alt') suppressAltMenu()
    hidePanelForCapture()
  })

  ipcMain.on(Channels.overlaySelect, (event, raw: unknown) => {
    if (!isOverlaySender(event.sender)) return
    void completeCapture(trigger, parseRect(raw))
  })

  ipcMain.on(Channels.overlayCancel, (event) => {
    if (!isOverlaySender(event.sender)) return
    cancelCapture(trigger)
  })
}
