import { describe, expect, it } from 'vitest'
import { placePanel, toPhysicalRect } from './geometry'
import { isLargeEnough } from '@/shared/lib/geometry'

describe('toPhysicalRect', () => {
  const rect = { x: 100, y: 50, width: 200, height: 120 }

  it.each([
    [1, { x: 100, y: 50, width: 200, height: 120 }],
    [1.25, { x: 125, y: 63, width: 250, height: 150 }],
    [1.5, { x: 150, y: 75, width: 300, height: 180 }]
  ])('scales DIP to physical pixels at %s', (ratio, expected) => {
    expect(toPhysicalRect(rect, ratio, { width: 4000, height: 3000 })).toEqual(expected)
  })

  it('clamps a selection that runs past the screen edge', () => {
    const result = toPhysicalRect({ x: 1800, y: 1000, width: 400, height: 300 }, 1, { width: 1920, height: 1080 })
    expect(result).toEqual({ x: 1800, y: 1000, width: 120, height: 80 })
  })

  it('never returns an empty rectangle', () => {
    const result = toPhysicalRect({ x: 5000, y: 5000, width: 10, height: 10 }, 1, { width: 1920, height: 1080 })
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
  })
})

describe('placePanel', () => {
  const area = { x: 0, y: 0, width: 1920, height: 1040 }
  const size = { width: 440, height: 560 }

  it('places the panel to the right of the selection', () => {
    expect(placePanel({ x: 100, y: 100, width: 300, height: 200 }, size, area)).toEqual({ x: 412, y: 100 })
  })

  it('falls back to the left when the right side is full', () => {
    expect(placePanel({ x: 1500, y: 100, width: 300, height: 200 }, size, area)).toEqual({ x: 1048, y: 100 })
  })

  it('falls back to below when neither side fits', () => {
    const anchor = { x: 300, y: 100, width: 1400, height: 300 }
    expect(placePanel(anchor, size, area)).toEqual({ x: 300, y: 412 })
  })

  it('keeps the panel inside the work area vertically', () => {
    expect(placePanel({ x: 100, y: 900, width: 300, height: 100 }, size, area)).toEqual({ x: 412, y: 480 })
  })

  it('respects a work area on a second monitor', () => {
    const second = { x: 1920, y: 0, width: 1920, height: 1040 }
    expect(placePanel({ x: 2000, y: 100, width: 200, height: 200 }, size, second)).toEqual({ x: 2212, y: 100 })
  })
})

describe('isLargeEnough', () => {
  it('rejects selections under 32 px on either side', () => {
    expect(isLargeEnough({ x: 0, y: 0, width: 31, height: 200 })).toBe(false)
    expect(isLargeEnough({ x: 0, y: 0, width: 200, height: 12 })).toBe(false)
    expect(isLargeEnough({ x: 0, y: 0, width: 32, height: 32 })).toBe(true)
  })
})
