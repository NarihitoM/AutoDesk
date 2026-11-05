export const MouseMessage = {
  Move: 0x0200,
  RightDown: 0x0204,
  RightUp: 0x0205
} as const

export interface ScreenPoint {
  x: number
  y: number
}

export type RightDragEvent =
  | { type: 'start'; origin: ScreenPoint; point: ScreenPoint }
  | { type: 'move'; point: ScreenPoint }
  | { type: 'end'; point: ScreenPoint }
  | { type: 'click' }

export interface HookDecision {
  block: boolean
  event?: RightDragEvent
}

type DragState = { kind: 'idle' } | { kind: 'pressed'; origin: ScreenPoint } | { kind: 'dragging' }

const PASS: HookDecision = { block: false }

export class RightDragTracker {
  private state: DragState = { kind: 'idle' }

  constructor(private readonly threshold: number) {}

  handle(message: number, point: ScreenPoint, injected: boolean, enabled: boolean): HookDecision {
    if (injected) return PASS

    switch (message) {
      case MouseMessage.RightDown:
        if (!enabled || this.state.kind !== 'idle') return PASS
        this.state = { kind: 'pressed', origin: point }
        return { block: true }

      case MouseMessage.Move:
        return this.move(point)

      case MouseMessage.RightUp:
        return this.release(point)

      default:
        return PASS
    }
  }

  private move(point: ScreenPoint): HookDecision {
    if (this.state.kind === 'dragging') return { block: false, event: { type: 'move', point } }
    if (this.state.kind !== 'pressed') return PASS

    const { origin } = this.state
    if (Math.hypot(point.x - origin.x, point.y - origin.y) < this.threshold) return PASS
    this.state = { kind: 'dragging' }
    return { block: false, event: { type: 'start', origin, point } }
  }

  private release(point: ScreenPoint): HookDecision {
    const previous = this.state
    this.state = { kind: 'idle' }
    if (previous.kind === 'pressed') return { block: true, event: { type: 'click' } }
    if (previous.kind === 'dragging') return { block: true, event: { type: 'end', point } }
    return PASS
  }
}

export type HookWorkerMessage = RightDragEvent | { type: 'ready'; threadId: number } | { type: 'failed' }
