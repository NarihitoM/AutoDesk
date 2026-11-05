import { Menu, Tray, nativeImage } from 'electron'
import { MODIFIER_LABELS } from '@/shared/lib/providers'
import type { ModifierKey } from '@/shared/types/settings'
import { APP_ICON_PATH } from '../lib/paths'

export interface TrayOptions {
  getModifier(): ModifierKey
  isPaused(): boolean
  setPaused(paused: boolean): void
  onSettings(): void
  onQuit(): void
}

export interface TrayHandle {
  refresh(): void
}

export function createTray(options: TrayOptions): TrayHandle {
  const icon = nativeImage.createFromPath(APP_ICON_PATH).resize({ width: 16, height: 16, quality: 'best' })
  const tray = new Tray(icon)

  const refresh = (): void => {
    const modifier = MODIFIER_LABELS[options.getModifier()]
    tray.setToolTip(`AutoDesk - hold ${modifier} and drag to ask AI`)
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: `Hold ${modifier} + drag to capture`, enabled: false },
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
