import { parentPort, workerData } from 'node:worker_threads'
import koffi from 'koffi'
import { asNumber, pick } from '../lib/json'
import { RightDragTracker, type HookWorkerMessage, type RightDragEvent } from './rightDrag'

const WH_MOUSE_LL = 14
const LLMHF_INJECTED = 0x1
const WM_REPLAY_CLICK = 0x8001
const INPUT_MOUSE = 0
const MOUSEEVENTF_RIGHTDOWN = 0x0008
const MOUSEEVENTF_RIGHTUP = 0x0010
const DRAG_THRESHOLD = 6

const user32 = koffi.load('user32.dll')
const kernel32 = koffi.load('kernel32.dll')

const POINT = koffi.struct('POINT', { x: 'int32_t', y: 'int32_t' })

const MSLLHOOKSTRUCT = koffi.struct('MSLLHOOKSTRUCT', {
  pt: POINT,
  mouseData: 'uint32_t',
  flags: 'uint32_t',
  time: 'uint32_t',
  dwExtraInfo: 'uintptr_t'
})

koffi.struct('MSG', {
  hwnd: 'void *',
  message: 'uint32_t',
  wParam: 'uintptr_t',
  lParam: 'intptr_t',
  time: 'uint32_t',
  pt: POINT,
  lPrivate: 'uint32_t'
})

const MOUSEINPUT = koffi.struct('MOUSEINPUT', {
  dx: 'int32_t',
  dy: 'int32_t',
  mouseData: 'uint32_t',
  dwFlags: 'uint32_t',
  time: 'uint32_t',
  dwExtraInfo: 'uintptr_t'
})

const INPUT = koffi.struct('INPUT', {
  type: 'uint32_t',
  u: koffi.union({ mi: MOUSEINPUT })
})

const HOOKPROC = koffi.proto('intptr_t __stdcall LowLevelMouseProc(int nCode, uintptr_t wParam, void *lParam)')

const SetWindowsHookExW: (id: number, proc: bigint, module: unknown, threadId: number) => unknown = user32.func(
  'void * __stdcall SetWindowsHookExW(int idHook, LowLevelMouseProc *lpfn, void *hmod, uint32_t dwThreadId)'
)
const CallNextHookEx: (hook: null, code: number, wParam: unknown, lParam: unknown) => number = user32.func(
  'intptr_t __stdcall CallNextHookEx(void *hhk, int nCode, uintptr_t wParam, void *lParam)'
)
const UnhookWindowsHookEx: (hook: unknown) => boolean = user32.func(
  'bool __stdcall UnhookWindowsHookEx(void *hhk)'
)
const GetMessageW: (message: object, window: null, min: number, max: number) => number = user32.func(
  'int __stdcall GetMessageW(_Out_ MSG *lpMsg, void *hWnd, uint32_t wMsgFilterMin, uint32_t wMsgFilterMax)'
)
const PostThreadMessageW: (threadId: number, message: number, wParam: number, lParam: number) => boolean =
  user32.func('bool __stdcall PostThreadMessageW(uint32_t idThread, uint32_t Msg, uintptr_t wParam, intptr_t lParam)')
const SendInput: (count: number, inputs: object[], size: number) => number = user32.func(
  'uint32_t __stdcall SendInput(uint32_t cInputs, INPUT *pInputs, int cbSize)'
)
const GetCurrentThreadId: () => number = kernel32.func('uint32_t __stdcall GetCurrentThreadId()')
const GetModuleHandleW: (name: null) => unknown = kernel32.func(
  'void * __stdcall GetModuleHandleW(const char16_t *lpModuleName)'
)

const shared = pick(workerData, 'flags')
const flags = new Int32Array(shared instanceof SharedArrayBuffer ? shared : new SharedArrayBuffer(4))
const tracker = new RightDragTracker(DRAG_THRESHOLD)
const threadId = GetCurrentThreadId()

function post(message: HookWorkerMessage): void {
  parentPort?.postMessage(message)
}

function dispatch(event: RightDragEvent): void {
  if (event.type === 'click') PostThreadMessageW(threadId, WM_REPLAY_CLICK, 0, 0)
  else post(event)
}

function replayRightClick(): void {
  const input = (dwFlags: number) => ({
    type: INPUT_MOUSE,
    u: { mi: { dx: 0, dy: 0, mouseData: 0, dwFlags, time: 0, dwExtraInfo: 0 } }
  })
  SendInput(2, [input(MOUSEEVENTF_RIGHTDOWN), input(MOUSEEVENTF_RIGHTUP)], koffi.sizeof(INPUT))
}

function onMouse(code: number, wParam: unknown, lParam: unknown): number {
  if (code === 0) {
    const info: unknown = koffi.decode(lParam, MSLLHOOKSTRUCT)
    const point = { x: asNumber(pick(info, 'pt', 'x')) ?? 0, y: asNumber(pick(info, 'pt', 'y')) ?? 0 }
    const injected = ((asNumber(pick(info, 'flags')) ?? 0) & LLMHF_INJECTED) !== 0
    const decision = tracker.handle(Number(wParam), point, injected, Atomics.load(flags, 0) === 1)
    if (decision.event) dispatch(decision.event)
    if (decision.block) return 1
  }
  return CallNextHookEx(null, code, wParam, lParam)
}

function run(): void {
  const callback = koffi.register(onMouse, koffi.pointer(HOOKPROC))
  const hook = SetWindowsHookExW(WH_MOUSE_LL, callback, GetModuleHandleW(null), 0)
  if (!hook) {
    koffi.unregister(callback)
    post({ type: 'failed' })
    return
  }

  post({ type: 'ready', threadId })
  const message = {}
  while (GetMessageW(message, null, 0, 0) > 0) {
    if (pick(message, 'message') === WM_REPLAY_CLICK) replayRightClick()
  }

  UnhookWindowsHookEx(hook)
  koffi.unregister(callback)
}

run()
