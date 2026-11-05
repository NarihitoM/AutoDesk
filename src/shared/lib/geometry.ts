import type { SelectionRect } from '@/shared/types/ipc'

export interface Point {
  x: number
  y: number
}

export function rectFromPoints(start: Point, end: Point): SelectionRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  }
}
