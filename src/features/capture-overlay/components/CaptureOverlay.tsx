import { useEffect } from 'react'
import { bridge } from '@/shared/lib/bridge'
import { useSelection } from '../hooks/useSelection'
import styles from './CaptureOverlay.module.css'

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
      className={styles.root}
      data-selecting={rect !== null}
      onContextMenu={(event) => event.preventDefault()}
      {...handlers}
    >
      {rect ? (
        <div
          className={styles.selection}
          style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        >
          <span className={styles.size} data-inside={rect.y < LABEL_SPACE}>
            {Math.round(rect.width)} x {Math.round(rect.height)}
          </span>
        </div>
      ) : (
        <div className={styles.hint}>Drag to select an area. Esc to cancel.</div>
      )}
    </div>
  )
}
