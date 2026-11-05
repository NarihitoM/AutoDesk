import type { SelectionRect } from '@/shared/types/ipc'

export const MIN_CAPTURE_SIZE = 32

export interface Point {
  x: number
  y: number
}

export function isLargeEnough(rect: SelectionRect): boolean {
  return rect.width >= MIN_CAPTURE_SIZE && rect.height >= MIN_CAPTURE_SIZE
}

export function rectFromPoints(start: Point, end: Point): SelectionRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  }
}
