import { Clock, FileText, Hash, Type } from 'lucide-react'
import { WATERMARK_URL } from '../lib/site'
import type { DocStats } from '../lib/utils'

interface StatusBarProps {
  stats: DocStats
  savedLabel: string
}

export function StatusBar({ stats, savedLabel }: StatusBarProps) {
  return (
    <footer className="no-print flex min-h-8 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-200 bg-white/80 px-4 py-1 text-xs text-ink-500 backdrop-blur-md sm:flex-nowrap sm:gap-y-0 sm:py-0 dark:border-ink-800 dark:bg-ink-900/80 dark:text-ink-400">
      <span className="flex items-center gap-1.5">
        <Type size={13} />
        {stats.words.toLocaleString()} words
      </span>
      <span className="flex items-center gap-1.5">
        <Hash size={13} />
        {stats.characters.toLocaleString()} chars
      </span>
      <span className="hidden items-center gap-1.5 sm:flex">
        <FileText size={13} />
        {stats.lines.toLocaleString()} lines
      </span>
      <span className="hidden items-center gap-1.5 sm:flex">
        <Clock size={13} />
        {stats.readingMinutes} min read
      </span>

      <span className="ml-auto flex min-w-0 items-center justify-end gap-4">
        <span className="hidden items-center gap-3 md:flex">
          <a
            href="/guide.html"
            className="shrink-0 text-ink-400 transition-colors hover:text-brand-600 dark:text-ink-500 dark:hover:text-brand-300"
          >
            Markdown guide
          </a>
          <a
            href="/privacy.html"
            className="shrink-0 text-ink-400 transition-colors hover:text-brand-600 dark:text-ink-500 dark:hover:text-brand-300"
          >
            Privacy
          </a>
        </span>
        <span className="min-w-0 truncate text-ink-400 dark:text-ink-500">
          {savedLabel}
        </span>
        <a
          href={WATERMARK_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="built by rifqysaputra.dev"
          className="group flex shrink-0 items-center gap-1.5 text-ink-400 transition-colors hover:text-brand-600 dark:text-ink-500 dark:hover:text-brand-300"
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-linear-to-br from-brand-400 to-brand-600"
          />
          <span className="hidden sm:inline">built by</span>
          <span className="font-medium text-ink-600 transition-colors group-hover:text-brand-600 dark:text-ink-300 dark:group-hover:text-brand-300">
            rifqysaputra.dev
          </span>
        </a>
      </span>
    </footer>
  )
}
