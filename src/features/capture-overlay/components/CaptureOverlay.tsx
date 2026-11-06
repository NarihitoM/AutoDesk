import { useEffect } from 'react'
import { bridge } from '@/shared/lib/bridge'
import { isLargeEnough } from '@/shared/lib/geometry'
import { useSelection } from '../hooks/useSelection'

const LABEL_SPACE = 30

export function CaptureOverlay() {
  const { rect, reset, showRemote, handlers } = useSelection({
    onBegin: bridge.overlay.begin,
    onComplete: bridge.overlay.select,
    onCancel: bridge.overlay.cancel
  })

  useEffect(() => bridge.overlay.onReset(reset), [reset])
  useEffect(() => bridge.overlay.onSelection(showRemote), [showRemote])

  return (
    <div
      className={`fixed inset-0 cursor-crosshair select-none ${rect ? 'bg-black/[0.004]' : 'bg-[rgba(8,10,16,0.24)]'}`}
      onContextMenu={(event) => event.preventDefault()}
      {...handlers}
    >
      {rect ? (
        <div
          className="absolute shadow-[0_0_0_100vmax_rgba(8,10,16,0.42)] outline-[1.5px] outline-accent outline-solid"
          style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        >
          <span
            className={`absolute rounded-md bg-chip px-2 py-1 text-xs whitespace-nowrap tabular-nums ${
              rect.y < LABEL_SPACE ? 'top-1.5 left-1.5' : '-top-7 -left-px'
            } ${isLargeEnough(rect) ? 'text-fg' : 'text-danger'}`}
          >
            {Math.round(rect.width)} x {Math.round(rect.height)}
          </span>
        </div>
      ) : (
        <div className="pointer-events-none fixed top-7 left-1/2 -translate-x-1/2 rounded-full border border-line-strong bg-chip px-3.5 py-2 text-[13px]">
          Drag to select an area. Esc to cancel.
        </div>
      )}
    </div>
  )
}
