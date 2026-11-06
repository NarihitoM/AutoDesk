import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { Channels } from '@/shared/lib/channels'
import type { AppTab, AutoDeskApi, PanelEvent, SelectionRect, Unsubscribe } from '@/shared/types/ipc'
import type { ListenerCommand, ListenerStatus, LiveEvent, Speaker } from '@/shared/types/live'
import type { ModelListRequest, ModelListResponse } from '@/shared/types/models'
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
    onSelection: (listener) => listen<SelectionRect>(Channels.overlaySelection, listener),
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
    save: (update: SettingsUpdate): Promise<SettingsView> => ipcRenderer.invoke(Channels.settingsSave, update),
    listModels: (request: ModelListRequest): Promise<ModelListResponse> =>
      ipcRenderer.invoke(Channels.modelsList, request),
    openDataFolder: () => ipcRenderer.send(Channels.openDataFolder),
    setDirty: (dirty: boolean) => ipcRenderer.send(Channels.settingsDirty, dirty),
    onSaveRequest: (listener) => listen<void>(Channels.settingsSaveRequest, listener),
    onShowTab: (listener) => listen<AppTab>(Channels.settingsShowTab, listener),
    close: () => ipcRenderer.send(Channels.settingsClose)
  },
  live: {
    onEvent: (listener) => listen<LiveEvent>(Channels.liveEvent, listener),
    ready: () => ipcRenderer.send(Channels.liveReady),
    start: () => ipcRenderer.send(Channels.liveStart),
    stop: () => ipcRenderer.send(Channels.liveStop),
    ask: () => ipcRenderer.send(Channels.liveAsk),
    close: () => ipcRenderer.send(Channels.liveClose),
    launch: () => ipcRenderer.send(Channels.liveLaunch)
  },
  listener: {
    onCommand: (listener) => listen<ListenerCommand>(Channels.listenerCommand, listener),
    sendAudio: (speaker: Speaker, pcm: ArrayBuffer) => ipcRenderer.send(Channels.listenerAudio, speaker, pcm),
    reportStatus: (status: ListenerStatus) => ipcRenderer.send(Channels.listenerStatus, status)
  }
}

contextBridge.exposeInMainWorld('autodesk', api)
