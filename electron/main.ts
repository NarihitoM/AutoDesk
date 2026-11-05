import { app } from 'electron'
import { KEY_REQUIRED } from '@/shared/lib/providers'
import { registerAiIpc } from './Ipc/ai.ipc'
import { registerCaptureIpc } from './Ipc/capture.ipc'
import { registerSettingsIpc } from './Ipc/settings.ipc'
import { getApiKey, getSettings, loadSettings, onSettingsChanged } from './settings/settingsStore'
import { CaptureTrigger } from './tools/captureTrigger'
import { startInputHook, stopInputHook } from './tools/inputHook'
import { createTray } from './tools/tray'
import {
  createOverlayWindow,
  createPanelWindow,
  hideOverlay,
  markQuitting,
  openSettingsWindow,
  restorePanel,
  showOverlay
} from './tools/windows'

const ARM_DELAY_MS = 150

function needsSetup(): boolean {
  const { activeProvider } = getSettings()
  return KEY_REQUIRED[activeProvider] && !getApiKey(activeProvider)
}

async function bootstrap(): Promise<void> {
  app.setAppUserModelId('com.autodesk.snip')
  await loadSettings()
  createOverlayWindow()
  createPanelWindow()

  let paused = false
  const trigger = new CaptureTrigger({
    armDelay: ARM_DELAY_MS,
    getModifier: () => getSettings().modifier,
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

  const tray = createTray({
    getModifier: () => getSettings().modifier,
    isPaused: () => paused,
    setPaused: (value) => {
      paused = value
      trigger.reset()
    },
    onSettings: openSettingsWindow,
    onQuit: () => app.quit()
  })
  onSettingsChanged(() => tray.refresh())

  startInputHook(trigger)
  if (needsSetup() || !app.isPackaged) openSettingsWindow()
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', openSettingsWindow)
  app.on('before-quit', () => {
    markQuitting()
    stopInputHook()
  })
  void app.whenReady().then(bootstrap)
}
