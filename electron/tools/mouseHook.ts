import type { Worker } from 'node:worker_threads'
import koffi from 'koffi'
import createMouseHookWorker from './mouseHook.worker?nodeWorker'
import type { HookWorkerMessage, RightDragEvent } from './rightDrag'

const WM_QUIT = 0x0012

const flags = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT))
let worker: Worker | null = null
let hookThreadId: number | null = null

function postQuit(threadId: number): void {
  const user32 = koffi.load('user32.dll')
  const PostThreadMessageW: (threadId: number, message: number, wParam: number, lParam: number) => boolean =
    user32.func('bool __stdcall PostThreadMessageW(uint32_t idThread, uint32_t Msg, uintptr_t wParam, intptr_t lParam)')
  PostThreadMessageW(threadId, WM_QUIT, 0, 0)
}

export function startMouseHook(onEvent: (event: RightDragEvent) => void): void {
  if (process.platform !== 'win32' || worker) return

  worker = createMouseHookWorker({ workerData: { flags: flags.buffer } })
  worker.on('message', (message: HookWorkerMessage) => {
    if (message.type === 'ready') hookThreadId = message.threadId
    else if (message.type === 'failed') console.error('AutoDesk: could not install the mouse hook')
    else onEvent(message)
  })
  worker.on('error', (error) => console.error('AutoDesk: mouse hook stopped', error))
  worker.on('exit', () => {
    worker = null
    hookThreadId = null
  })
}

export function setMouseHookEnabled(enabled: boolean): void {
  Atomics.store(flags, 0, enabled ? 1 : 0)
}

export function stopMouseHook(): void {
  setMouseHookEnabled(false)
  if (hookThreadId !== null) postQuit(hookThreadId)
}
