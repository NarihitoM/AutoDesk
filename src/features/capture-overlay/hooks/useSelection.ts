import { useCallback, useState, type PointerEvent } from 'react'
import { rectFromPoints, type Point } from '@/shared/lib/geometry'
import type { SelectionRect } from '@/shared/types/ipc'

const MIN_SIZE = 8

interface SelectionCallbacks {
  onBegin(): void
  onComplete(rect: SelectionRect): void
  onCancel(): void
}

function pointOf(event: PointerEvent<HTMLElement>): Point {
  return { x: event.clientX, y: event.clientY }
}

export function useSelection({ onBegin, onComplete, onCancel }: SelectionCallbacks) {
  const [start, setStart] = useState<Point | null>(null)
  const [end, setEnd] = useState<Point | null>(null)
  const [remote, setRemote] = useState<SelectionRect | null>(null)

  const reset = useCallback(() => {
    setStart(null)
    setEnd(null)
    setRemote(null)
  }, [])

  const onPointerDown = (event: PointerEvent<HTMLElement>): void => {
    if (remote) return
    if (event.button === 2) {
      reset()
      onCancel()
      return
    }
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = pointOf(event)
    setStart(point)
    setEnd(point)
    onBegin()
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>): void => {
    if (start) setEnd(pointOf(event))
  }

  const onPointerUp = (event: PointerEvent<HTMLElement>): void => {
    if (remote || !start || event.button !== 0) return
    const rect = rectFromPoints(start, pointOf(event))
    reset()
    if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) {
      onCancel()
    } else {
      onComplete(rect)
    }
  }

  return {
    rect: remote ?? (start && end ? rectFromPoints(start, end) : null),
    reset,
    showRemote: setRemote,
    handlers: { onPointerDown, onPointerMove, onPointerUp }
  }
}
