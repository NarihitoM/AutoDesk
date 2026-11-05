import type { SelectionRect } from '@/shared/types/ipc'

export interface Size {
  width: number
  height: number
}

export interface Bounds extends Size {
  x: number
  y: number
}

export interface Position {
  x: number
  y: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

export function toPhysicalRect(rect: SelectionRect, ratio: number, image: Size): Bounds {
  const x = clamp(Math.round(rect.x * ratio), 0, image.width - 1)
  const y = clamp(Math.round(rect.y * ratio), 0, image.height - 1)
  const right = clamp(Math.round((rect.x + rect.width) * ratio), x + 1, image.width)
  const bottom = clamp(Math.round((rect.y + rect.height) * ratio), y + 1, image.height)
  return { x, y, width: right - x, height: bottom - y }
}

export function placePanel(anchor: Bounds, size: Size, area: Bounds, gap = 12): Position {
  const areaRight = area.x + area.width
  const areaBottom = area.y + area.height
  const fitsX = (x: number): boolean => x >= area.x && x + size.width <= areaRight
  const fitsY = (y: number): boolean => y >= area.y && y + size.height <= areaBottom

  const alignedY = clamp(anchor.y, area.y, areaBottom - size.height)
  const right = anchor.x + anchor.width + gap
  if (fitsX(right)) return { x: right, y: alignedY }

  const left = anchor.x - gap - size.width
  if (fitsX(left)) return { x: left, y: alignedY }

  const alignedX = clamp(anchor.x, area.x, areaRight - size.width)
  const below = anchor.y + anchor.height + gap
  if (fitsY(below)) return { x: alignedX, y: below }

  const above = anchor.y - gap - size.height
  if (fitsY(above)) return { x: alignedX, y: above }

  return {
    x: clamp(areaRight - size.width - gap, area.x, areaRight - size.width),
    y: alignedY
  }
}
