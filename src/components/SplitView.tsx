import { useCallback, useRef, type ReactNode } from 'react'

interface SplitViewProps {
  left: ReactNode
  right: ReactNode
  /** Percentage (0..100) of width given to the left pane. */
  ratio: number
  onRatioChange: (ratio: number) => void
}

const MIN = 20
const MAX = 80

export function SplitView({
  left,
  right,
  ratio,
  onRatioChange,
}: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const pct = ((clientX - rect.left) / rect.width) * 100
      onRatioChange(Math.min(MAX, Math.max(MIN, pct)))
    },
    [onRatioChange],
  )

  const startDrag = () => {
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      updateFromClientX(e.clientX)
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      <div
        className="h-full min-w-0 overflow-hidden"
        style={{ width: `${ratio}%` }}
      >
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        onMouseDown={startDrag}
        onDoubleClick={() => onRatioChange(50)}
        className="group relative w-1.5 shrink-0 cursor-col-resize bg-ink-200 transition-colors hover:bg-brand-500 dark:bg-ink-800 dark:hover:bg-brand-500"
      >
        <span className="absolute top-1/2 left-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-400/0 transition-colors group-hover:bg-white/70 dark:group-hover:bg-white/70" />
      </div>
      <div className="h-full min-w-0 flex-1 overflow-hidden">{right}</div>
    </div>
  )
}
