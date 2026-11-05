import type { ModifierKey } from '@/shared/types/settings'

export const KeyCode = {
  Escape: 1,
  Alt: 56,
  AltRight: 3640,
  Ctrl: 29,
  CtrlRight: 3613,
  Shift: 42,
  ShiftRight: 54
} as const

const MODIFIER_CODES: Record<ModifierKey, readonly number[]> = {
  alt: [KeyCode.Alt, KeyCode.AltRight],
  ctrl: [KeyCode.Ctrl, KeyCode.CtrlRight],
  shift: [KeyCode.Shift, KeyCode.ShiftRight]
}

export type TriggerState = 'idle' | 'pending' | 'armed' | 'dragging' | 'blocked'

export interface TriggerOptions {
  armDelay: number
  getModifier(): ModifierKey | null
  isEnabled(): boolean
  onArm(): void
  onCancel(): void
}

export class CaptureTrigger {
  private state: TriggerState = 'idle'
  private modifierHeld = false
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly options: TriggerOptions) {}

  get current(): TriggerState {
    return this.state
  }

  keyDown(keycode: number): void {
    if (this.isModifier(keycode)) {
      if (this.modifierHeld) return
      this.modifierHeld = true
      if (this.state === 'idle' && this.options.isEnabled()) {
        this.state = 'pending'
        this.timer = setTimeout(() => this.arm(), this.options.armDelay)
      }
      return
    }

    if (keycode === KeyCode.Escape) {
      if (this.state === 'armed' || this.state === 'dragging') this.options.onCancel()
      this.reset()
      return
    }

    if (this.state === 'pending' || this.state === 'armed') {
      if (this.state === 'armed') this.options.onCancel()
      this.reset()
    }
  }

  keyUp(keycode: number): void {
    if (!this.isModifier(keycode)) return
    this.modifierHeld = false
    if (this.state === 'armed') this.options.onCancel()
    if (this.state !== 'dragging') this.reset()
  }

  mouseDown(): void {
    if (this.state === 'pending') this.reset()
  }

  beginDrag(): boolean {
    if (this.state !== 'armed') return false
    this.state = 'dragging'
    return true
  }

  beginMouseDrag(): boolean {
    if (this.state !== 'idle' || !this.options.isEnabled()) return false
    this.state = 'dragging'
    return true
  }

  reset(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.state = this.modifierHeld ? 'blocked' : 'idle'
  }

  private arm(): void {
    this.timer = null
    if (this.state !== 'pending') return
    this.state = 'armed'
    this.options.onArm()
  }

  private isModifier(keycode: number): boolean {
    const modifier = this.options.getModifier()
    return modifier !== null && MODIFIER_CODES[modifier].includes(keycode)
  }
}
