import { desktopCapturer, type Display, type NativeImage } from 'electron'
import type { SelectionRect } from '@/shared/types/ipc'
import { toPhysicalRect } from './geometry'

export async function captureRegion(display: Display, rect: SelectionRect): Promise<NativeImage> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(display.size.width * display.scaleFactor),
      height: Math.round(display.size.height * display.scaleFactor)
    }
  })

  const source =
    sources.find((item) => item.display_id === String(display.id)) ??
    (sources.length === 1 ? sources[0] : undefined)
  if (!source) throw new Error('Could not find the screen to capture.')

  const shot = source.thumbnail
  const size = shot.getSize()
  if (size.width === 0) throw new Error('Screen capture returned an empty image.')

  return shot.crop(toPhysicalRect(rect, size.width / display.size.width, size))
}
