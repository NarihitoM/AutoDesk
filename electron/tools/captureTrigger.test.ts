import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CaptureTrigger, KeyCode } from './captureTrigger'

const KEY_TAB = 15

function setup(enabled = true) {
  const onArm = vi.fn()
  const onCancel = vi.fn()
  const trigger = new CaptureTrigger({
    armDelay: 150,
    getModifier: () => 'alt',
    isEnabled: () => enabled,
    onArm,
    onCancel
  })
  return { trigger, onArm, onCancel }
}

describe('CaptureTrigger', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('arms after the modifier is held alone', () => {
    const { trigger, onArm } = setup()
    trigger.keyDown(KeyCode.Alt)
    vi.advanceTimersByTime(149)
    expect(onArm).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onArm).toHaveBeenCalledOnce()
    expect(trigger.current).toBe('armed')
  })

  it('ignores key repeat while the modifier is held', () => {
    const { trigger, onArm } = setup()
    trigger.keyDown(KeyCode.Alt)
    vi.advanceTimersByTime(100)
    trigger.keyDown(KeyCode.Alt)
    vi.advanceTimersByTime(50)
    expect(onArm).toHaveBeenCalledOnce()
  })

  it('does not arm for a quick shortcut like Alt+Tab', () => {
    const { trigger, onArm } = setup()
    trigger.keyDown(KeyCode.Alt)
    trigger.keyDown(KEY_TAB)
    vi.advanceTimersByTime(500)
    expect(onArm).not.toHaveBeenCalled()
    expect(trigger.current).toBe('blocked')
    trigger.keyUp(KeyCode.Alt)
    expect(trigger.current).toBe('idle')
  })

  it('cancels when another key is pressed while armed', () => {
    const { trigger, onCancel } = setup()
    trigger.keyDown(KeyCode.Alt)
    vi.advanceTimersByTime(150)
    trigger.keyDown(KEY_TAB)
    expect(onCancel).toHaveBeenCalledOnce()
    expect(trigger.current).toBe('blocked')
  })

  it('cancels when the modifier is released before dragging', () => {
    const { trigger, onCancel } = setup()
    trigger.keyDown(KeyCode.Alt)
    vi.advanceTimersByTime(150)
    trigger.keyUp(KeyCode.Alt)
    expect(onCancel).toHaveBeenCalledOnce()
    expect(trigger.current).toBe('idle')
  })

  it('does not arm when a click happens before the delay', () => {
    const { trigger, onArm } = setup()
    trigger.keyDown(KeyCode.Alt)
    trigger.mouseDown()
    vi.advanceTimersByTime(500)
    expect(onArm).not.toHaveBeenCalled()
  })

  it('keeps dragging after the modifier is released', () => {
    const { trigger, onCancel } = setup()
    trigger.keyDown(KeyCode.Alt)
    vi.advanceTimersByTime(150)
    expect(trigger.beginDrag()).toBe(true)
    trigger.keyUp(KeyCode.Alt)
    trigger.keyDown(KeyCode.Ctrl)
    expect(trigger.current).toBe('dragging')
    expect(onCancel).not.toHaveBeenCalled()
    trigger.reset()
    expect(trigger.current).toBe('idle')
  })

  it('cancels a drag with Escape', () => {
    const { trigger, onCancel } = setup()
    trigger.keyDown(KeyCode.Alt)
    vi.advanceTimersByTime(150)
    trigger.beginDrag()
    trigger.keyDown(KeyCode.Escape)
    expect(onCancel).toHaveBeenCalledOnce()
    expect(trigger.current).toBe('blocked')
  })

  it('refuses to start a drag unless armed', () => {
    const { trigger } = setup()
    expect(trigger.beginDrag()).toBe(false)
  })

  it('stays idle while paused', () => {
    const { trigger, onArm } = setup(false)
    trigger.keyDown(KeyCode.Alt)
    vi.advanceTimersByTime(500)
    expect(onArm).not.toHaveBeenCalled()
  })
})
