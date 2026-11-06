import { Menu, Tray, nativeImage } from 'electron'
import { CAPTURE_GESTURES } from '@/shared/lib/providers'
import type { CaptureKey } from '@/shared/types/settings'
import { APP_ICON_PATH } from '../lib/paths'

export interface TrayOptions {
  getCaptureKey(): CaptureKey
  isPaused(): boolean
  setPaused(paused: boolean): void
  onSettings(): void
  onLive(): void
  onQuit(): void
}

export interface TrayHandle {
  refresh(): void
}

export function createTray(options: TrayOptions): TrayHandle {
  const icon = nativeImage.createFromPath(APP_ICON_PATH).resize({ width: 16, height: 16, quality: 'best' })
  const tray = new Tray(icon)

  const refresh = (): void => {
    const gesture = CAPTURE_GESTURES[options.getCaptureKey()]
    tray.setToolTip(`AutoDesk - ${gesture.toLowerCase()} to ask AI`)
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: `${gesture} to capture`, enabled: false },
        { type: 'separator' },
        {
          label: 'Pause capture',
          type: 'checkbox',
          checked: options.isPaused(),
          click: (item) => {
            options.setPaused(item.checked)
            refresh()
          }
        },
        { label: 'Live assist', click: options.onLive },
        { label: 'Settings', click: options.onSettings },
        { type: 'separator' },
        { label: 'Quit AutoDesk', click: options.onQuit }
      ])
    )
  }

  tray.on('double-click', options.onSettings)
  refresh()
  return { refresh }
}
