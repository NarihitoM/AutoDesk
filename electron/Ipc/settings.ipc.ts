import { ipcMain } from 'electron'
import { Channels } from '@/shared/lib/channels'
import { KEY_REQUIRED } from '@/shared/lib/providers'
import { modelCatalogs } from '../Agent/models'
import { sanitizeModelListRequest } from '../settings/sanitize'
import { getApiKey, getSettingsView, saveSettings } from '../settings/settingsStore'
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

  ipcMain.handle(Channels.modelsList, (event, raw: unknown) => {
    if (!isSettingsSender(event.sender)) throw new Error('Not allowed')
    const request = sanitizeModelListRequest(raw)
    const apiKey = request.apiKey ?? getApiKey(request.provider)
    if (KEY_REQUIRED[request.provider] && !apiKey) {
      throw new Error('Add an API key to load the model list.')
    }
    return modelCatalogs[request.provider]({ baseUrl: request.baseUrl, apiKey })
  })
}
