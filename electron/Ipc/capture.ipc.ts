import { dialog, ipcMain, screen } from 'electron'
import { isLargeEnough, rectFromPoints, type Point } from '@/shared/lib/geometry'
import { Channels } from '@/shared/lib/channels'
import type { SelectionRect } from '@/shared/types/ipc'
import { startSession } from '../Agent/assistant'
import { pick } from '../lib/json'
import { getSettings } from '../settings/settingsStore'
import type { CaptureTrigger } from '../tools/captureTrigger'
import { suppressAltMenu } from '../tools/inputHook'
import type { RightDragEvent, ScreenPoint } from '../tools/rightDrag'
import { captureRegion } from '../tools/screenCapture'
import {
  getOverlayDisplay,
  hideOverlay,
  hidePanelForCapture,
  isOverlaySender,
  restorePanel,
  sendOverlaySelection,
  showOverlay,
  showPanelNear
} from '../tools/windows'

let dragOrigin: Point | null = null

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseRect(raw: unknown): SelectionRect | null {
  const x = finite(pick(raw, 'x'))
  const y = finite(pick(raw, 'y'))
  const width = finite(pick(raw, 'width'))
  const height = finite(pick(raw, 'height'))
  if (x === null || y === null || width === null || height === null) return null
  const rect = { x, y, width, height }
  return isLargeEnough(rect) ? rect : null
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

function localPoint(point: ScreenPoint): Point | null {
  const display = getOverlayDisplay()
  if (!display) return null
  const dip = screen.screenToDipPoint(point)
  const { x, y, width, height } = display.bounds
  return {
    x: Math.min(Math.max(dip.x - x, 0), width),
    y: Math.min(Math.max(dip.y - y, 0), height)
  }
}

function selectionTo(point: ScreenPoint): SelectionRect | null {
  const end = localPoint(point)
  return dragOrigin && end ? rectFromPoints(dragOrigin, end) : null
}

export function handleRightDrag(trigger: CaptureTrigger, event: RightDragEvent): void {
  if (event.type === 'start') {
    if (!trigger.beginMouseDrag()) return
    showOverlay(screen.screenToDipPoint(event.origin))
    hidePanelForCapture()
    dragOrigin = localPoint(event.origin)
  }

  if (trigger.current !== 'dragging' || !dragOrigin) return

  if (event.type === 'start' || event.type === 'move') {
    const rect = selectionTo(event.point)
    if (rect) sendOverlaySelection(rect)
    return
  }

  if (event.type === 'end') {
    const rect = selectionTo(event.point)
    dragOrigin = null
    void completeCapture(trigger, rect && isLargeEnough(rect) ? rect : null)
  }
}

export function registerCaptureIpc(trigger: CaptureTrigger): void {
  ipcMain.on(Channels.overlayBegin, (event) => {
    if (!isOverlaySender(event.sender) || !trigger.beginDrag()) return
    if (getSettings().captureKey === 'alt') suppressAltMenu()
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
