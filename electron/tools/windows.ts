import {
  BrowserWindow,
  desktopCapturer,
  dialog,
  nativeTheme,
  screen,
  session,
  shell,
  type Display,
  type Point,
  type WebContents,
  type WebPreferences
} from 'electron'
import { Channels } from '@/shared/lib/channels'
import type { AppTab, PanelEvent, SelectionRect } from '@/shared/types/ipc'
import type { ListenerCommand, LiveEvent } from '@/shared/types/live'
import type { ThemeMode } from '@/shared/types/settings'
import { APP_WINDOW_ICON_PATH, PRELOAD_PATH, RENDERER_HTML_PATH } from '../lib/paths'
import { placePanel } from './geometry'

type Route = 'overlay' | 'panel' | 'settings' | 'live' | 'listener'

const PANEL_SIZE = { width: 440, height: 560 }
const LIVE_SIZE = { width: 420, height: 640 }
const LISTENER_PARTITION = 'autodesk-listener'
const SURFACE_COLORS = { dark: '#14151b', light: '#f6f7fa' }

let overlay: BrowserWindow | null = null
let overlayDisplay: Display | null = null
let panel: BrowserWindow | null = null
let panelHiddenForCapture = false
let settings: BrowserWindow | null = null
let settingsDirty = false
let quitting = false
let live: BrowserWindow | null = null
let listener: BrowserWindow | null = null

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

function loadRoute(window: BrowserWindow, route: Route, section?: string): void {
  const hash = section ? `${route}/${section}` : route
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) {
    void window.loadURL(`${devUrl}#${hash}`)
  } else {
    void window.loadFile(RENDERER_HTML_PATH, { hash })
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

function surfaceColor(): string {
  return nativeTheme.shouldUseDarkColors ? SURFACE_COLORS.dark : SURFACE_COLORS.light
}

export function applyTheme(mode: ThemeMode): void {
  nativeTheme.themeSource = mode
}

export function watchTheme(): void {
  nativeTheme.on('updated', () => {
    const color = surfaceColor()
    panel?.setBackgroundColor(color)
    live?.setBackgroundColor(color)
    settings?.setBackgroundColor(color)
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
    icon: APP_WINDOW_ICON_PATH,
    backgroundColor: surfaceColor(),
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

export function openSettingsWindow(tab: AppTab = 'settings'): void {
  if (settings) {
    if (settings.isMinimized()) settings.restore()
    settings.show()
    settings.focus()
    settings.webContents.send(Channels.settingsShowTab, tab)
    return
  }

  settings = new BrowserWindow({
    width: 620,
    height: 760,
    minWidth: 480,
    minHeight: 520,
    show: false,
    title: 'AutoDesk',
    icon: APP_WINDOW_ICON_PATH,
    autoHideMenuBar: true,
    backgroundColor: surfaceColor(),
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
  loadRoute(settings, 'settings', tab)
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

export function openLiveWindow(onClosed: () => void): void {
  if (live) {
    live.show()
    live.focus()
    return
  }

  live = new BrowserWindow({
    ...LIVE_SIZE,
    minWidth: 340,
    minHeight: 360,
    show: false,
    frame: false,
    resizable: true,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    title: 'AutoDesk Live',
    icon: APP_WINDOW_ICON_PATH,
    backgroundColor: surfaceColor(),
    webPreferences: webPreferences()
  })
  live.setAlwaysOnTop(true, 'floating')
  harden(live)
  live.once('ready-to-show', () => live?.show())
  live.on('closed', () => {
    live = null
    onClosed()
  })
  loadRoute(live, 'live')
}

export function closeLiveWindow(): void {
  live?.close()
}

export function isLiveSender(sender: WebContents): boolean {
  return live?.webContents === sender
}

export function sendLiveEvent(event: LiveEvent): void {
  live?.webContents.send(Channels.liveEvent, event)
  if (event.type === 'status') settings?.webContents.send(Channels.liveEvent, event)
}

function prepareListenerSession(): Electron.Session {
  const listenerSession = session.fromPartition(LISTENER_PARTITION)
  const allowed = (permission: string): boolean => permission === 'media' || permission === 'display-capture'
  listenerSession.setPermissionRequestHandler((_contents, permission, callback) => callback(allowed(permission)))
  listenerSession.setPermissionCheckHandler((_contents, permission) => allowed(permission))
  listenerSession.setDisplayMediaRequestHandler((_request, callback) => {
    void desktopCapturer
      .getSources({ types: ['screen'] })
      .then(([source]) => callback(source ? { video: source, audio: 'loopback' } : {}))
      .catch(() => callback({}))
  })
  return listenerSession
}

function ensureListenerWindow(): BrowserWindow {
  if (listener) return listener
  const created = new BrowserWindow({
    show: false,
    width: 320,
    height: 200,
    skipTaskbar: true,
    webPreferences: webPreferences({ session: prepareListenerSession(), backgroundThrottling: false })
  })
  harden(created)
  created.on('closed', () => {
    if (listener === created) listener = null
  })
  loadRoute(created, 'listener')
  listener = created
  return created
}

export function sendListenerCommand(command: ListenerCommand): void {
  if (command.type === 'stop' && !listener) return
  const target = ensureListenerWindow()
  if (target.webContents.isLoading()) {
    target.webContents.once('did-finish-load', () => target.webContents.send(Channels.listenerCommand, command))
  } else {
    target.webContents.send(Channels.listenerCommand, command)
  }
}

export function isListenerSender(sender: WebContents): boolean {
  return listener?.webContents === sender
}
