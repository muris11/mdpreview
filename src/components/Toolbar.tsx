import {
  ArrowUpDown,
  Check,
  Columns2,
  Copy,
  Download,
  Eye,
  FileCode2,
  FileDown,
  FileText,
  FolderOpen,
  Link2,
  Maximize2,
  Minimize2,
  Moon,
  Pencil,
  Printer,
  RotateCcw,
  Sun,
  WrapText,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Theme, ViewMode } from '../lib/storage'

interface ToolbarProps {
  title: string
  onTitleChange: (title: string) => void
  view: ViewMode
  onViewChange: (view: ViewMode) => void
  theme: Theme
  onThemeToggle: () => void
  wrap: boolean
  onWrapToggle: () => void
  sync: boolean
  onSyncToggle: () => void
  zen: boolean
  onZenToggle: () => void
  onCopyMarkdown: () => void
  onCopyHtml: () => void
  onCopyRich: () => void
  onOpenFile: () => void
  onDownloadMarkdown: () => void
  onDownloadHtml: () => void
  onPrint: () => void
  onShare: () => void
  onReset: () => void
}

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`btn btn-icon ${active ? 'btn-active' : ''}`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return (
    <span
      aria-hidden
      className="mx-1 h-5 w-px shrink-0 bg-ink-200 dark:bg-ink-700"
    />
  )
}

export function Toolbar(props: ToolbarProps) {
  const {
    title,
    onTitleChange,
    view,
    onViewChange,
    theme,
    onThemeToggle,
    wrap,
    onWrapToggle,
    sync,
    onSyncToggle,
    zen,
    onZenToggle,
    onCopyMarkdown,
    onCopyHtml,
    onCopyRich,
    onOpenFile,
    onDownloadMarkdown,
    onDownloadHtml,
    onPrint,
    onShare,
    onReset,
  } = props

  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const flash = (key: string) => {
    setCopied(key)
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400)
  }

  return (
    <header className="no-print flex h-14 shrink-0 items-center gap-1 border-b border-ink-200 bg-white/80 px-2 backdrop-blur-md md:px-3 dark:border-ink-800 dark:bg-ink-900/80">
      <div className="flex items-center gap-2 pr-1">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-brand-400 to-brand-600 text-white shadow-sm">
          <FileText size={17} strokeWidth={2.4} />
        </span>
        <span className="hidden text-sm font-semibold tracking-tight sm:block">
          MDPreview
        </span>
      </div>

      <Divider />

      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled document"
        spellCheck={false}
        className="h-9 w-32 min-w-0 rounded-lg bg-transparent px-2 text-sm font-medium text-ink-700 outline-none placeholder:text-ink-400 hover:bg-ink-100 focus:bg-ink-100 sm:w-48 md:w-64 dark:text-ink-200 dark:hover:bg-white/8 dark:focus:bg-white/8"
      />

      <div className="mx-auto flex items-center gap-1">
        <div className="hidden items-center gap-0.5 rounded-xl bg-ink-100 p-0.5 sm:flex dark:bg-white/5">
          <button
            type="button"
            onClick={() => onViewChange('editor')}
            title="Editor only"
            className={`btn btn-icon h-8 w-8 ${view === 'editor' ? 'btn-active bg-white shadow-sm dark:bg-white/10' : ''}`}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onViewChange('split')}
            title="Split view"
            className={`btn btn-icon h-8 w-8 ${view === 'split' ? 'btn-active bg-white shadow-sm dark:bg-white/10' : ''}`}
          >
            <Columns2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => onViewChange('preview')}
            title="Preview only"
            className={`btn btn-icon h-8 w-8 ${view === 'preview' ? 'btn-active bg-white shadow-sm dark:bg-white/10' : ''}`}
          >
            <Eye size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <IconButton
          label={wrap ? 'Disable word wrap' : 'Enable word wrap'}
          active={wrap}
          onClick={onWrapToggle}
        >
          <WrapText size={16} />
        </IconButton>
        <IconButton
          label={sync ? 'Disable scroll sync' : 'Enable scroll sync'}
          active={sync}
          onClick={onSyncToggle}
        >
          <ArrowUpDown size={16} />
        </IconButton>
        <IconButton
          label={zen ? 'Exit focus mode' : 'Focus mode'}
          active={zen}
          onClick={onZenToggle}
        >
          {zen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </IconButton>

        <Divider />

        <div className="relative">
          <IconButton
            label="Copy & export"
            active={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </IconButton>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="card absolute right-0 z-50 mt-2 w-56 overflow-hidden p-1 text-sm shadow-xl">
                <MenuItem
                  icon={<FolderOpen size={15} />}
                  label="Open file…"
                  onClick={() => {
                    onOpenFile()
                    setMenuOpen(false)
                  }}
                />
                <div className="my-1 h-px bg-ink-200 dark:bg-ink-700" />
                <MenuItem
                  icon={<Copy size={15} />}
                  label="Copy Markdown"
                  onClick={() => {
                    onCopyMarkdown()
                    flash('md')
                  }}
                />
                <MenuItem
                  icon={<FileCode2 size={15} />}
                  label="Copy HTML"
                  onClick={() => {
                    onCopyHtml()
                    flash('html')
                  }}
                />
                <MenuItem
                  icon={<FileCode2 size={15} />}
                  label="Copy rich text"
                  onClick={() => {
                    onCopyRich()
                    flash('rich')
                  }}
                />
                <div className="my-1 h-px bg-ink-200 dark:bg-ink-700" />
                <MenuItem
                  icon={<FileDown size={15} />}
                  label="Download .md"
                  onClick={() => {
                    onDownloadMarkdown()
                    setMenuOpen(false)
                  }}
                />
                <MenuItem
                  icon={<Download size={15} />}
                  label="Download .html"
                  onClick={() => {
                    onDownloadHtml()
                    setMenuOpen(false)
                  }}
                />
                <MenuItem
                  icon={<Printer size={15} />}
                  label="Print / Export PDF"
                  onClick={() => {
                    onPrint()
                    setMenuOpen(false)
                  }}
                />
              </div>
            </>
          )}
        </div>

        <IconButton label="Reset document" onClick={onReset}>
          <RotateCcw size={16} />
        </IconButton>

        <IconButton
          label={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          onClick={onThemeToggle}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>

        <button
          type="button"
          onClick={onShare}
          className="btn btn-primary ml-1 h-9 gap-1.5 px-3"
        >
          <Link2 size={16} />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>
    </header>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-white/8 dark:hover:text-white"
    >
      <span className="text-ink-400 dark:text-ink-500">{icon}</span>
      {label}
    </button>
  )
}
