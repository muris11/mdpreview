import { Check, Copy, ExternalLink, Link2, Share2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { buildShareUrl, encodeShare } from '../lib/share'
import { formatBytes } from '../lib/utils'

interface ShareDialogProps {
  open: boolean
  onClose: () => void
  title: string
  content: string
  onNotify: (message: string) => void
}

/**
 * Recommended maximum URL length. Browsers and servers commonly handle up to
 * ~2000 characters reliably, and chat apps truncate long links aggressively.
 */
const SAFE_URL_LENGTH = 2000

export function ShareDialog({
  open,
  onClose,
  title,
  content,
  onNotify,
}: ShareDialogProps) {
  if (!open) return null
  return (
    <ShareDialogContent
      onClose={onClose}
      title={title}
      content={content}
      onNotify={onNotify}
    />
  )
}

function ShareDialogContent({
  onClose,
  title,
  content,
  onNotify,
}: Omit<ShareDialogProps, 'open'>) {
  const [copied, setCopied] = useState(false)

  const url = useMemo(
    () => buildShareUrl({ m: content, t: title || undefined }),
    [content, title],
  )

  const payloadBytes = useMemo(
    () => encodeShare({ m: content, t: title || undefined }).length,
    [content, title],
  )

  const tooLong = url.length > SAFE_URL_LENGTH

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      onNotify('Share link copied to clipboard')
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      onNotify('Could not access the clipboard — copy manually')
    }
  }

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Markdown document',
          url,
        })
      } catch {
        /* user cancelled */
      }
    } else {
      void copy()
    }
  }

  return (
    <div className="no-print fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="card relative z-10 w-full max-w-lg p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-500">
              <Share2 size={20} />
            </span>
            <div>
              <h2 className="text-base font-semibold">Share this document</h2>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                The whole document lives inside the link — no server needed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-icon"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <Link2 size={16} className="shrink-0 text-ink-400" />
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="h-10 w-full min-w-0 rounded-lg border border-ink-200 bg-ink-50 px-3 font-mono text-xs text-ink-600 outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-300"
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500 dark:text-ink-400">
          <span>
            Link length:{' '}
            <strong
              className={
                tooLong
                  ? 'text-amber-500'
                  : 'text-emerald-500 dark:text-emerald-400'
              }
            >
              {url.length.toLocaleString()} chars
            </strong>
          </span>
          <span>
            Compressed payload: <strong>{formatBytes(payloadBytes)}</strong>
          </span>
        </div>

        {tooLong && (
          <p className="mb-4 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            This document is large, so the link may be truncated by some apps.
            Consider shortening the text or exporting a file instead.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copy}
            className="btn btn-primary flex-1 justify-center"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button type="button" onClick={shareNative} className="btn">
            <ExternalLink size={16} />
            Share…
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
          >
            <ExternalLink size={16} />
            Open
          </a>
        </div>
      </div>
    </div>
  )
}
