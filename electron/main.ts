import { app } from 'electron'
import { KEY_REQUIRED, modifierOf } from '@/shared/lib/providers'
import { registerAiIpc } from './Ipc/ai.ipc'
import { handleRightDrag, registerCaptureIpc } from './Ipc/capture.ipc'
import { registerLiveIpc } from './Ipc/live.ipc'
import { registerSettingsIpc } from './Ipc/settings.ipc'
import { liveSession } from './live/liveSession'
import { getApiKey, getSettings, loadSettings, onSettingsChanged } from './settings/settingsStore'
import { CaptureTrigger } from './tools/captureTrigger'
import { startInputHook, stopInputHook } from './tools/inputHook'
import { setMouseHookEnabled, startMouseHook, stopMouseHook } from './tools/mouseHook'
import { createTray } from './tools/tray'
import {
  createOverlayWindow,
  createPanelWindow,
  hideOverlay,
  applyTheme,
  markQuitting,
  openSettingsWindow,
  restorePanel,
  showOverlay,
  watchTheme
} from './tools/windows'

const ARM_DELAY_MS = 150

function needsSetup(): boolean {
  const { activeProvider, providers } = getSettings()
  return (KEY_REQUIRED[activeProvider] && !getApiKey(activeProvider)) || !providers[activeProvider].model
}

async function bootstrap(): Promise<void> {
  app.setAppUserModelId('com.autodesk.snip')
  await loadSettings()
  applyTheme(getSettings().theme)
  watchTheme()
  createOverlayWindow()
  createPanelWindow()

  let paused = false
  const syncMouseHook = (): void => setMouseHookEnabled(!paused && getSettings().captureKey === 'right-mouse')
  const trigger = new CaptureTrigger({
    armDelay: ARM_DELAY_MS,
    getModifier: () => modifierOf(getSettings().captureKey),
    isEnabled: () => !paused,
    onArm: showOverlay,
    onCancel: () => {
      hideOverlay()
      restorePanel()
    }
  })

  registerCaptureIpc(trigger)
  registerAiIpc()
  registerSettingsIpc()
  registerLiveIpc()

  const tray = createTray({
    getCaptureKey: () => getSettings().captureKey,
    isPaused: () => paused,
    setPaused: (value) => {
      paused = value
      trigger.reset()
      syncMouseHook()
    },
    onSettings: () => openSettingsWindow(),
    onLive: () => openSettingsWindow('live'),
    onQuit: () => app.quit()
  })
  onSettingsChanged((settings) => {
    applyTheme(settings.theme)
    tray.refresh()
    syncMouseHook()
  })

  startInputHook(trigger)
  startMouseHook((event) => handleRightDrag(trigger, event))
  syncMouseHook()
  if (needsSetup() || !app.isPackaged) openSettingsWindow()
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => openSettingsWindow())
  app.on('before-quit', () => {
    markQuitting()
    liveSession.stop()
    stopMouseHook()
    stopInputHook()
  })
  void app.whenReady().then(bootstrap)
}
