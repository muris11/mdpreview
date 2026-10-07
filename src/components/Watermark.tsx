import { WATERMARK_TEXT, WATERMARK_URL } from '../lib/site'

/**
 * Subtle attribution badge shown in the corner of the preview. It stays out of
 * the way while writing but travels with screenshots and shared documents.
 */
export function Watermark({ variant = 'floating' }: { variant?: 'floating' | 'inline' }) {
  if (variant === 'inline') {
    return (
      <div className="no-print pointer-events-none flex items-center justify-center gap-1.5 py-3 text-[11px] text-ink-400 dark:text-ink-500">
        <span>built by</span>
        <a
          href={WATERMARK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto font-semibold text-brand-500 hover:text-brand-600 dark:hover:text-brand-300"
        >
          rifqysaputra.dev
        </a>
      </div>
    )
  }

  return (
    <>
      <a
        href={WATERMARK_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={WATERMARK_TEXT}
        className="no-print group pointer-events-auto fixed right-4 bottom-11 z-30 flex items-center gap-1.5 rounded-full border border-ink-200 bg-white/85 px-3 py-1.5 text-[11px] font-medium text-ink-500 shadow-sm backdrop-blur-md transition-all hover:border-brand-400/60 hover:text-brand-600 hover:shadow-md dark:border-ink-700 dark:bg-ink-900/85 dark:text-ink-400 dark:hover:text-brand-300"
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-linear-to-br from-brand-400 to-brand-600"
        />
        <span className="hidden sm:inline">built by</span>
        <span className="font-semibold text-ink-700 group-hover:text-brand-600 dark:text-ink-200 dark:group-hover:text-brand-300">
          rifqysaputra.dev
        </span>
      </a>
      {/* Print-only attribution footer (visible on printed pages / PDF). */}
      <div className="print-watermark hidden">
        <a href={WATERMARK_URL}>{WATERMARK_TEXT}</a>
      </div>
    </>
  )
}
