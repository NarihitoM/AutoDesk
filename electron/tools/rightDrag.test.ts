import { describe, expect, it } from 'vitest'
import { MouseMessage, RightDragTracker } from './rightDrag'

const at = (x: number, y: number) => ({ x, y })

describe('RightDragTracker', () => {
  it('turns a short right-click into a replayed click', () => {
    const tracker = new RightDragTracker(6)
    expect(tracker.handle(MouseMessage.RightDown, at(10, 10), false, true)).toEqual({ block: true })
    expect(tracker.handle(MouseMessage.Move, at(12, 11), false, true)).toEqual({ block: false })
    expect(tracker.handle(MouseMessage.RightUp, at(12, 11), false, true)).toEqual({
      block: true,
      event: { type: 'click' }
    })
  })

  it('starts a drag once the cursor moves past the threshold', () => {
    const tracker = new RightDragTracker(6)
    tracker.handle(MouseMessage.RightDown, at(10, 10), false, true)
    expect(tracker.handle(MouseMessage.Move, at(20, 10), false, true)).toEqual({
      block: false,
      event: { type: 'start', origin: at(10, 10), point: at(20, 10) }
    })
    expect(tracker.handle(MouseMessage.Move, at(60, 40), false, true).event).toEqual({
      type: 'move',
      point: at(60, 40)
    })
    expect(tracker.handle(MouseMessage.RightUp, at(80, 50), false, true)).toEqual({
      block: true,
      event: { type: 'end', point: at(80, 50) }
    })
  })

  it('passes everything through when disabled', () => {
    const tracker = new RightDragTracker(6)
    expect(tracker.handle(MouseMessage.RightDown, at(0, 0), false, false)).toEqual({ block: false })
    expect(tracker.handle(MouseMessage.Move, at(50, 50), false, false)).toEqual({ block: false })
    expect(tracker.handle(MouseMessage.RightUp, at(50, 50), false, false)).toEqual({ block: false })
  })

  it('ignores injected input so replayed clicks reach the app', () => {
    const tracker = new RightDragTracker(6)
    expect(tracker.handle(MouseMessage.RightDown, at(0, 0), true, true)).toEqual({ block: false })
    expect(tracker.handle(MouseMessage.RightUp, at(0, 0), true, true)).toEqual({ block: false })
  })

  it('finishes a drag that started before capture was paused', () => {
    const tracker = new RightDragTracker(6)
    tracker.handle(MouseMessage.RightDown, at(0, 0), false, true)
    tracker.handle(MouseMessage.Move, at(30, 30), false, true)
    expect(tracker.handle(MouseMessage.RightUp, at(40, 40), false, false).event).toEqual({
      type: 'end',
      point: at(40, 40)
    })
  })
})
