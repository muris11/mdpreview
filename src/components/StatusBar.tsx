import { Clock, FileText, Hash, Type } from 'lucide-react'
import type { DocStats } from '../lib/utils'

interface StatusBarProps {
  stats: DocStats
  savedLabel: string
}

export function StatusBar({ stats, savedLabel }: StatusBarProps) {
  return (
    <footer className="no-print flex h-8 shrink-0 items-center gap-4 border-t border-ink-200 bg-white/80 px-4 text-xs text-ink-500 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/80 dark:text-ink-400">
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
      <span className="ml-auto truncate text-ink-400 dark:text-ink-500">
        {savedLabel}
      </span>
    </footer>
  )
}
