import { useEffect, useRef } from 'react'
import { renderMermaid } from '../lib/mermaid'
import { renderMarkdown } from '../lib/markdown'
import { sanitize } from '../lib/sanitize'
import type { Theme } from '../lib/storage'

interface PreviewPaneProps {
  content: string
  theme: Theme
  /** Called with the current scroll ratio (0..1) whenever the pane scrolls. */
  onScrollRatio?: (ratio: number) => void
  /** Registers a callback so parents can imperatively scroll the preview. */
  scrollToRatioRef?: React.RefObject<((ratio: number) => void) | null>
}

export function PreviewPane({
  content,
  theme,
  onScrollRatio,
  scrollToRatioRef,
}: PreviewPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const mermaidTimer = useRef<number | null>(null)

  // Render markdown -> sanitized HTML, then hydrate mermaid diagrams.
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return

    const html = sanitize(renderMarkdown(content))
    body.innerHTML = html

    if (mermaidTimer.current) window.clearTimeout(mermaidTimer.current)
    mermaidTimer.current = window.setTimeout(() => {
      void renderMermaid(body, theme)
    }, 150)

    return () => {
      if (mermaidTimer.current) window.clearTimeout(mermaidTimer.current)
    }
  }, [content, theme])

  // Re-render diagrams when the theme changes (colors differ per theme).
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    void renderMermaid(body, theme)
  }, [theme])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleScroll = () => {
      const max = el.scrollHeight - el.clientHeight
      onScrollRatio?.(max > 0 ? el.scrollTop / max : 0)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })

    if (scrollToRatioRef) {
      scrollToRatioRef.current = (ratio: number) => {
        const max = el.scrollHeight - el.clientHeight
        el.scrollTop = max * ratio
      }
    }

    return () => el.removeEventListener('scroll', handleScroll)
  }, [onScrollRatio, scrollToRatioRef])

  return (
    <div
      ref={containerRef}
      className="print-area h-full overflow-y-auto px-6 py-6 md:px-10 md:py-8"
    >
      <div
        ref={bodyRef}
        className="markdown-body mx-auto max-w-3xl"
        spellCheck={false}
      />
    </div>
  )
}
