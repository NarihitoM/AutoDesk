import {
  BrowserWindow,
  dialog,
  screen,
  shell,
  type Display,
  type Point,
  type WebContents,
  type WebPreferences
} from 'electron'
import { Channels } from '@/shared/lib/channels'
import type { PanelEvent, SelectionRect } from '@/shared/types/ipc'
import { APP_ICON_PATH, PRELOAD_PATH, RENDERER_HTML_PATH } from '../lib/paths'
import { placePanel } from './geometry'

type Route = 'overlay' | 'panel' | 'settings'

const PANEL_SIZE = { width: 440, height: 560 }
const SURFACE_COLOR = '#14151b'

let overlay: BrowserWindow | null = null
let overlayDisplay: Display | null = null
let panel: BrowserWindow | null = null
let panelHiddenForCapture = false
let settings: BrowserWindow | null = null
let settingsDirty = false
let quitting = false

function webPreferences(extra: WebPreferences = {}): WebPreferences {
  return {
    preload: PRELOAD_PATH,
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false,
    spellcheck: false,
    ...extra
  }
}

function loadRoute(window: BrowserWindow, route: Route): void {
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) {
    void window.loadURL(`${devUrl}#${route}`)
  } else {
    void window.loadFile(RENDERER_HTML_PATH, { hash: route })
  }
}

function harden(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event) => event.preventDefault())
}

function keepAliveOnClose(window: BrowserWindow): void {
  window.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    window.hide()
  })
}

export function markQuitting(): void {
  quitting = true
}

export function createOverlayWindow(): void {
  overlay = new BrowserWindow({
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    alwaysOnTop: true,
    enableLargerThanScreen: true,
    webPreferences: webPreferences({ backgroundThrottling: false })
  })
  overlay.setAlwaysOnTop(true, 'screen-saver')
  overlay.setContentProtection(true)
  harden(overlay)
  keepAliveOnClose(overlay)
  loadRoute(overlay, 'overlay')
}

export function showOverlay(point: Point = screen.getCursorScreenPoint()): void {
  if (!overlay) return
  const display = screen.getDisplayNearestPoint(point)
  overlayDisplay = display
  overlay.setBounds(display.bounds)
  overlay.setBounds(display.bounds)
  overlay.webContents.send(Channels.overlayReset)
  overlay.showInactive()
}

export function hideOverlay(): void {
  if (!overlay?.isVisible()) return
  overlay.hide()
  overlay.webContents.send(Channels.overlayReset)
}

export function sendOverlaySelection(rect: SelectionRect): void {
  overlay?.webContents.send(Channels.overlaySelection, rect)
}

export function getOverlayDisplay(): Display | null {
  return overlayDisplay
}

export function isOverlaySender(sender: WebContents): boolean {
  return overlay?.webContents === sender
}

export function createPanelWindow(): void {
  panel = new BrowserWindow({
    show: false,
    ...PANEL_SIZE,
    minWidth: 320,
    minHeight: 260,
    frame: false,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: 'AutoDesk',
    icon: APP_ICON_PATH,
    backgroundColor: SURFACE_COLOR,
    webPreferences: webPreferences()
  })
  panel.setAlwaysOnTop(true, 'floating')
  harden(panel)
  keepAliveOnClose(panel)
  loadRoute(panel, 'panel')
}

export function showPanelNear(display: Display, rect: SelectionRect): void {
  if (!panel) return
  const [width = PANEL_SIZE.width, height = PANEL_SIZE.height] = panel.getSize()
  const anchor = {
    x: Math.round(display.bounds.x + rect.x),
    y: Math.round(display.bounds.y + rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  }
  const position = placePanel(anchor, { width, height }, display.workArea)
  panelHiddenForCapture = false
  panel.setPosition(position.x, position.y)
  panel.show()
  panel.focus()
}

export function hidePanel(): void {
  panelHiddenForCapture = false
  panel?.hide()
}

export function hidePanelForCapture(): void {
  if (!panel?.isVisible()) return
  panelHiddenForCapture = true
  panel.hide()
}

export function restorePanel(): void {
  if (!panelHiddenForCapture) return
  panelHiddenForCapture = false
  panel?.showInactive()
}

export function isPanelSender(sender: WebContents): boolean {
  return panel?.webContents === sender
}

export function sendPanelEvent(event: PanelEvent): void {
  panel?.webContents.send(Channels.panelEvent, event)
}

export function openSettingsWindow(): void {
  if (settings) {
    if (settings.isMinimized()) settings.restore()
    settings.show()
    settings.focus()
    return
  }

  settings = new BrowserWindow({
    width: 620,
    height: 760,
    minWidth: 480,
    minHeight: 520,
    show: false,
    title: 'AutoDesk Settings',
    icon: APP_ICON_PATH,
    autoHideMenuBar: true,
    backgroundColor: SURFACE_COLOR,
    webPreferences: webPreferences()
  })
  settings.removeMenu()
  settings.on('page-title-updated', (event) => event.preventDefault())
  harden(settings)
  settings.once('ready-to-show', () => settings?.show())
  settings.on('close', (event) => {
    if (!settingsDirty || quitting || !settings) return
    event.preventDefault()
    confirmSettingsClose(settings)
  })
  settings.on('closed', () => {
    settings = null
    settingsDirty = false
  })
  loadRoute(settings, 'settings')
}

function confirmSettingsClose(window: BrowserWindow): void {
  const choice = dialog.showMessageBoxSync(window, {
    type: 'warning',
    title: 'AutoDesk Settings',
    message: 'You have unsaved changes.',
    detail: 'Do you want to save your changes before closing Settings?',
    buttons: ['Save', "Don't save", 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    noLink: true
  })
  if (choice === 0) window.webContents.send(Channels.settingsSaveRequest)
  if (choice === 1) closeSettingsWindow()
}

export function setSettingsDirty(dirty: boolean): void {
  settingsDirty = dirty
}

export function closeSettingsWindow(): void {
  settingsDirty = false
  settings?.close()
}

export function isSettingsSender(sender: WebContents): boolean {
  return settings?.webContents === sender
}
