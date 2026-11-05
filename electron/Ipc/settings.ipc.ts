import { ipcMain } from 'electron'
import { Channels } from '@/shared/lib/channels'
import { getSettingsView, saveSettings } from '../settings/settingsStore'
import { isSettingsSender } from '../tools/windows'

export function registerSettingsIpc(): void {
  ipcMain.handle(Channels.settingsGet, (event) => {
    if (!isSettingsSender(event.sender)) throw new Error('Not allowed')
    return getSettingsView()
  })

  ipcMain.handle(Channels.settingsSave, (event, raw: unknown) => {
    if (!isSettingsSender(event.sender)) throw new Error('Not allowed')
    return saveSettings(raw)
  })
}
