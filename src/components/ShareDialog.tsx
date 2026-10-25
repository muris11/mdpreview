import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Share2,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { buildShareUrl, encodeShare, titleToSlug } from '../lib/share'
import {
  createShortLink,
  PASTE_EXPIRY_DAYS,
  shortLinkErrorCode,
} from '../lib/shortlink'
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

/** Turns a `createShortLink` failure into something the user can act on. */
function shortLinkMessage(error: unknown): string {
  switch (shortLinkErrorCode(error)) {
    case 'rate-limited':
      return 'The paste service is rate-limiting requests — wait a few seconds and press Try again.'
    case 'network':
      return 'Could not reach the paste service — check your connection and press Try again.'
    case 'rejected':
      return 'The paste service rejected this document — copy the full link below instead.'
    default:
      return 'Could not create a short link — copy the full link below instead.'
  }
}

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
  const [shortCopied, setShortCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [short, setShort] = useState<{
    rev: string
    url?: string
    error?: string
  } | null>(null)

  const url = useMemo(
    () => buildShareUrl({ m: content, t: title || undefined }),
    [content, title],
  )

  const payloadBytes = useMemo(
    () => encodeShare({ m: content, t: title || undefined }).length,
    [content, title],
  )

  const tooLong = url.length > SAFE_URL_LENGTH
  const slug = title ? titleToSlug(title) : ''

  // A short link points at one exact revision of the document, so it is only
  // shown while the title and content still match what was uploaded.
  const rev = `${title}\u0000${content}`
  const shortUrl = short?.rev === rev ? (short.url ?? null) : null
  const shortError = short?.rev === rev ? (short.error ?? null) : null

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
    const target = shortUrl ?? url
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Markdown document',
          url: target,
        })
      } catch {
        /* user cancelled */
      }
    } else {
      void copy()
    }
  }

  const createShort = async () => {
    setCreating(true)
    setShortCopied(false)
    setShort({ rev })
    try {
      const link = await createShortLink({ m: content, t: title || undefined })
      setShort({ rev, url: link })
      onNotify('Short link created')
    } catch (error) {
      setShort({ rev, error: shortLinkMessage(error) })
    } finally {
      setCreating(false)
    }
  }

  const copyShort = async () => {
    if (!shortUrl) return
    try {
      await navigator.clipboard.writeText(shortUrl)
      setShortCopied(true)
      onNotify('Short link copied to clipboard')
      window.setTimeout(() => setShortCopied(false), 1800)
    } catch {
      onNotify('Could not access the clipboard — copy manually')
    }
  }

  return (
    <div className="no-print fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        className="card relative z-10 w-full max-w-lg p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/12 text-brand-500">
              <Share2 size={20} />
            </span>
            <div>
              <h2 id="share-dialog-title" className="text-base font-semibold">
                Share this document
              </h2>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Short link for chat, or a private link that needs no server.
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

        {/* Short link (stored on a free public paste service). */}
        <div className="mb-4 rounded-xl border border-ink-200 bg-ink-50/70 p-3 dark:border-ink-700 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Zap size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="text-xs font-semibold">Short link</p>
                <p className="text-[11px] leading-snug text-ink-500 dark:text-ink-400">
                  {title ? (
                    <>
                      Clean link like{' '}
                      <code className="rounded bg-ink-100 px-1 font-mono text-[10px] dark:bg-white/10">
                        /s/abc123
                      </code>
                      .{' '}
                    </>
                  ) : (
                    <>Add a title for a tidier link. </>
                  )}
                  Stored on dpaste.com and expires in {PASTE_EXPIRY_DAYS} days.
                </p>
              </div>
            </div>
            {!shortUrl && !shortError && (
              <button
                type="button"
                onClick={createShort}
                disabled={creating}
                className="btn btn-primary shrink-0"
              >
                {creating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Zap size={16} />
                )}
                {creating ? 'Creating…' : 'Create'}
              </button>
            )}
          </div>

          {shortUrl && (
            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value={shortUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="h-10 w-full min-w-0 rounded-lg border border-ink-200 bg-white px-3 font-mono text-xs text-ink-700 outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-200"
              />
              <button
                type="button"
                onClick={copyShort}
                aria-label={shortCopied ? 'Short link copied' : 'Copy short link'}
                className="btn btn-primary shrink-0"
              >
                {shortCopied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          )}

          {shortError && (
            <div className="mt-2 flex items-start justify-between gap-3">
              <p className="text-[11px] leading-snug text-amber-600 dark:text-amber-400">
                {shortError}
              </p>
              <button
                type="button"
                onClick={createShort}
                disabled={creating}
                className="btn shrink-0"
              >
                {creating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Zap size={14} />
                )}
                {creating ? 'Retrying…' : 'Try again'}
              </button>
            </div>
          )}
        </div>

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
          Full link (private)
        </p>

        <div className="mb-3 flex items-center gap-2">
          <Link2 size={16} className="shrink-0 text-ink-400" />
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="h-10 w-full min-w-0 rounded-lg border border-ink-200 bg-ink-50 px-3 font-mono text-xs text-ink-600 outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-300"
          />
        </div>

        <p className="mb-3 text-xs text-ink-500 dark:text-ink-400">
          {title ? (
            <>
              The link path uses your document title —{' '}
              <code className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[11px] text-brand-600 dark:bg-white/8 dark:text-brand-300">
                /{slug}
              </code>{' '}
              — which helps it look clean and rank in search.
            </>
          ) : (
            <>
              💡 Give your document a <strong>title</strong> in the toolbar to get
              a clean, readable link like{' '}
              <code className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[11px] dark:bg-white/8">
                /my-document
              </code>
              .
            </>
          )}
        </p>

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
            Create a short link above, or export a file instead.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copy}
            className="btn btn-primary flex-1 justify-center"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy full link'}
          </button>
          <button type="button" onClick={shareNative} className="btn">
            <ExternalLink size={16} />
            Share…
          </button>
          <a
            href={shortUrl ?? url}
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
