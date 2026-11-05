import { uIOhook, UiohookKey } from 'uiohook-napi'
import type { CaptureTrigger } from './captureTrigger'

export function startInputHook(trigger: CaptureTrigger): void {
  uIOhook.on('keydown', (event) => trigger.keyDown(event.keycode))
  uIOhook.on('keyup', (event) => trigger.keyUp(event.keycode))
  uIOhook.on('mousedown', () => trigger.mouseDown())
  uIOhook.start()
}

export function stopInputHook(): void {
  uIOhook.removeAllListeners()
  uIOhook.stop()
}

export function suppressAltMenu(): void {
  uIOhook.keyTap(UiohookKey.Ctrl)
}
