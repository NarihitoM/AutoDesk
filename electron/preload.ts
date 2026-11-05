import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { Channels } from '@/shared/lib/channels'
import type { AutoDeskApi, PanelEvent, SelectionRect, Unsubscribe } from '@/shared/types/ipc'
import type { SettingsUpdate, SettingsView } from '@/shared/types/settings'

function listen<T>(channel: string, listener: (payload: T) => void): Unsubscribe {
  const handler = (_event: IpcRendererEvent, payload: T): void => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}

const api: AutoDeskApi = {
  overlay: {
    onReset: (listener) => listen<void>(Channels.overlayReset, listener),
    begin: () => ipcRenderer.send(Channels.overlayBegin),
    select: (rect: SelectionRect) => ipcRenderer.send(Channels.overlaySelect, rect),
    cancel: () => ipcRenderer.send(Channels.overlayCancel)
  },
  panel: {
    onEvent: (listener) => listen<PanelEvent>(Channels.panelEvent, listener),
    ready: () => ipcRenderer.send(Channels.panelReady),
    ask: (text: string) => ipcRenderer.send(Channels.panelAsk, text),
    stop: () => ipcRenderer.send(Channels.panelStop),
    close: () => ipcRenderer.send(Channels.panelClose)
  },
  settings: {
    get: (): Promise<SettingsView> => ipcRenderer.invoke(Channels.settingsGet),
    save: (update: SettingsUpdate): Promise<SettingsView> => ipcRenderer.invoke(Channels.settingsSave, update)
  }
}

contextBridge.exposeInMainWorld('autodesk', api)
