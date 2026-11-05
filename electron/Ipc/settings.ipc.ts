import { ipcMain } from 'electron'
import { Channels } from '@/shared/lib/channels'
import { KEY_REQUIRED } from '@/shared/lib/providers'
import type { ModelListResponse } from '@/shared/types/models'
import { modelCatalogs } from '../Agent/models'
import { sanitizeModelListRequest } from '../settings/sanitize'
import { getApiKey, getSettingsView, openDataDirectory, saveSettings } from '../settings/settingsStore'
import { closeSettingsWindow, isSettingsSender, setSettingsDirty } from '../tools/windows'

export function registerSettingsIpc(): void {
  ipcMain.handle(Channels.settingsGet, (event) => {
    if (!isSettingsSender(event.sender)) throw new Error('Not allowed')
    return getSettingsView()
  })

  ipcMain.handle(Channels.settingsSave, (event, raw: unknown) => {
    if (!isSettingsSender(event.sender)) throw new Error('Not allowed')
    return saveSettings(raw)
  })

  ipcMain.on(Channels.openDataFolder, (event) => {
    if (isSettingsSender(event.sender)) void openDataDirectory()
  })

  ipcMain.on(Channels.settingsDirty, (event, dirty: unknown) => {
    if (isSettingsSender(event.sender)) setSettingsDirty(dirty === true)
  })

  ipcMain.on(Channels.settingsClose, (event) => {
    if (isSettingsSender(event.sender)) closeSettingsWindow()
  })

  ipcMain.handle(Channels.modelsList, async (event, raw: unknown): Promise<ModelListResponse> => {
    if (!isSettingsSender(event.sender)) throw new Error('Not allowed')
    try {
      const request = sanitizeModelListRequest(raw)
      const apiKey = request.apiKey ?? getApiKey(request.provider)
      if (KEY_REQUIRED[request.provider] && !apiKey) {
        return { ok: false, error: 'Add an API key to load the model list.' }
      }
      const result = await modelCatalogs[request.provider]({ baseUrl: request.baseUrl, apiKey })
      return { ok: true, result }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Could not load models.' }
    }
  })
}
