import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorPane } from './components/EditorPane'
import { PreviewPane } from './components/PreviewPane'
import { ShareDialog } from './components/ShareDialog'
import { SplitView } from './components/SplitView'
import { StatusBar } from './components/StatusBar'
import { ToastStack } from './components/ToastStack'
import { Toolbar } from './components/Toolbar'
import { Watermark } from './components/Watermark'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useToasts } from './hooks/useToasts'
import { buildStandaloneHtml, copyRichText } from './lib/export'
import { renderMarkdown } from './lib/markdown'
import { downloadPdf } from './lib/pdf'
import { SAMPLE_DOCUMENT } from './lib/sample'
import { applySeo } from './lib/seo'
import {
  buildShareUrl,
  encodeShare,
  readShareFromHash,
  readSlugFromPath,
  slugToTitle,
  titleToSlug,
} from './lib/share'
import { fetchShortLink, shortIdFromPath } from './lib/shortlink'
import { isImageFile } from './lib/images'
import { storage, type Theme, type ViewMode } from './lib/storage'
import {
  computeStats,
  download,
  slugifyFilename,
  type DocStats,
} from './lib/utils'

function initialTheme(): Theme {
  const stored = storage.loadTheme()
  if (stored) return stored
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

interface InitialDoc {
  content: string
  title: string
  fromShare: boolean
}

function loadInitialDoc(shortId: string | null): InitialDoc {
  const shared = readShareFromHash(window.location.hash)
  if (shared) {
    // Prefer the readable title from the URL path when present.
    const pathSlug = readSlugFromPath(window.location.pathname)
    return {
      content: shared.m,
      title: shared.t ?? (pathSlug ? slugToTitle(pathSlug) : 'Shared document'),
      fromShare: true,
    }
  }
  if (shortId) {
    // Content is fetched asynchronously from the paste service (see below).
    return { content: '', title: '', fromShare: true }
  }
  const saved = storage.loadDoc()
  if (saved && typeof saved.content === 'string') {
    return { content: saved.content, title: saved.title || '', fromShare: false }
  }
  return { content: SAMPLE_DOCUMENT, title: 'Welcome', fromShare: false }
}

export default function App() {
  const initialShortId = useMemo(() => {
    if (readShareFromHash(window.location.hash)) return null
    return shortIdFromPath(window.location.pathname)
  }, [])
  const initial = useMemo(() => loadInitialDoc(initialShortId), [initialShortId])

  const [content, setContent] = useState(initial.content)
  const [title, setTitle] = useState(initial.title)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [view, setView] = useState<ViewMode>(() => storage.loadView())
  const [wrap, setWrap] = useState(() => storage.loadWrap())
  const [sync, setSync] = useState(() => storage.loadSync())
  const [split, setSplit] = useState(() => storage.loadSplit())
  const [zen, setZen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  /** True once the browser refuses the autosave write (usually a full quota). */
  const [saveFailed, setSaveFailed] = useState(false)
  /** Keeps the storage-full toast from firing on every keystroke. */
  const announcedSaveFailure = useRef(false)
  /** True while a `/s/<id>` document is still downloading. */
  const [loadingShort, setLoadingShort] = useState(initialShortId !== null)

  const { toasts, notify, dismiss } = useToasts()
  const debouncedContent = useDebouncedValue(content, 120)

  const scrollToEditor = useRef<((ratio: number) => void) | null>(null)
  const scrollToPreview = useRef<((ratio: number) => void) | null>(null)
  const syncingFrom = useRef<'editor' | 'preview' | null>(null)
  /** Points at the rendered `.markdown-body` used for PDF export. */
  const previewBodyRef = useRef<HTMLDivElement | null>(null)

  const stats: DocStats = useMemo(() => computeStats(content), [content])

  // Persist document (debounced) and keep the tab title in sync.
  useEffect(() => {
    // Don't clobber the local copy while a short link is still loading.
    if (loadingShort) return
    const timer = window.setTimeout(() => {
      const ok = storage.saveDoc({ content, title })
      setSaveFailed(!ok)
      if (ok) {
        announcedSaveFailure.current = false
        setSavedAt(new Date())
      } else if (!announcedSaveFailure.current) {
        announcedSaveFailure.current = true
        notify('Storage is full — this document is not being saved', 'info')
      }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [content, title, loadingShort, notify])

  // Dynamic SEO metadata for crawlers and social sharing. Only documents that
  // arrived from a share link are indexable at their own URL; a locally
  // authored document canonicalises to the home page.
  useEffect(() => {
    applySeo({ title, content, shared: initial.fromShare })
  }, [title, content, initial.fromShare])

  // One-time hint so people discover that images can be pasted with Ctrl/Cmd+V.
  useEffect(() => {
    try {
      if (window.localStorage.getItem('mdpreview:imageHint')) return
      window.localStorage.setItem('mdpreview:imageHint', '1')
    } catch {
      return
    }
    const timer = window.setTimeout(() => {
      notify(
        'Tip: press Ctrl/Cmd + V to paste an image straight into the document',
        'info',
      )
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [notify])

  // Resolve a `/s/<id>` short link by downloading its document.
  useEffect(() => {
    if (!initialShortId) return
    let cancelled = false
    notify('Loading shared document…', 'info')
    void (async () => {
      const payload = await fetchShortLink(initialShortId)
      if (cancelled) return
      if (payload) {
        setContent(payload.m)
        setTitle(payload.t ?? slugToTitle(initialShortId))
        notify('Shared document loaded')
      } else {
        notify('This short link is invalid or has expired', 'info')
        const saved = storage.loadDoc()
        if (saved && typeof saved.content === 'string') {
          setContent(saved.content)
          setTitle(saved.title || '')
        } else {
          setContent(SAMPLE_DOCUMENT)
          setTitle('Welcome')
        }
      }
      setLoadingShort(false)
    })()
    return () => {
      cancelled = true
    }
  }, [initialShortId, notify])

  // Keep the address bar shareable: readable title slug in the path and the
  // compressed document in the hash, so copying the URL from the address bar
  // always produces a working share link. Debounced to avoid thrashing.
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Never rewrite the address bar while viewing a short link.
    if (initialShortId || window.location.pathname.startsWith('/s/')) return
    const timer = window.setTimeout(() => {
      const slug = title.trim() ? titleToSlug(title) : ''
      const path = slug ? `/${slug}` : '/'
      const hash = `#md=${encodeShare({
        m: content,
        t: title || undefined,
      })}`
      const next = path + hash
      const current = window.location.pathname + window.location.hash
      if (current !== next) {
        // Browsers cap how long an address bar entry may be; a very large
        // document must not throw here and take the editor down with it.
        try {
          window.history.replaceState(null, '', next)
        } catch {
          /* keep the previous, shorter entry */
        }
      }
    }, 700)
    return () => window.clearTimeout(timer)
  }, [content, title, initialShortId])

  // Theme persistence + <html> class + mermaid re-render trigger.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    storage.saveTheme(theme)
  }, [theme])

  useEffect(() => storage.saveView(view), [view])
  useEffect(() => storage.saveWrap(wrap), [wrap])
  useEffect(() => storage.saveSync(sync), [sync])
  useEffect(() => storage.saveSplit(split), [split])

  const syncScroll = useCallback(
    (source: 'editor' | 'preview', ratio: number) => {
      if (!sync || view !== 'split' || zen) return
      if (syncingFrom.current && syncingFrom.current !== source) return
      syncingFrom.current = source
      const target = source === 'editor' ? scrollToPreview : scrollToEditor
      target.current?.(ratio)
      window.setTimeout(() => {
        syncingFrom.current = null
      }, 60)
    },
    [sync, view, zen],
  )

  const onEditorScroll = useCallback(
    (ratio: number) => syncScroll('editor', ratio),
    [syncScroll],
  )
  const onPreviewScroll = useCallback(
    (ratio: number) => syncScroll('preview', ratio),
    [syncScroll],
  )

  const filename = useMemo(() => slugifyFilename(title), [title])

  const copyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      notify('Markdown copied to clipboard')
    } catch {
      notify('Clipboard unavailable', 'info')
    }
  }, [content, notify])

  const copyHtml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(renderMarkdown(content))
      notify('HTML copied to clipboard')
    } catch {
      notify('Clipboard unavailable', 'info')
    }
  }, [content, notify])

  const copyRich = useCallback(async () => {
    try {
      await copyRichText(renderMarkdown(content), content)
      notify('Rich text copied — paste into Docs or Word')
    } catch {
      notify('Clipboard unavailable', 'info')
    }
  }, [content, notify])

  const downloadMarkdown = useCallback(() => {
    download(`${filename}.md`, content, 'text/markdown;charset=utf-8')
    notify('Markdown file downloaded')
  }, [content, filename, notify])

  const downloadHtml = useCallback(() => {
    const html = buildStandaloneHtml(title, renderMarkdown(content), theme)
    download(`${filename}.html`, html, 'text/html;charset=utf-8')
    notify('HTML file downloaded')
  }, [content, filename, notify, theme, title])

  const exportPdf = useCallback(async () => {
    const source = previewBodyRef.current
    if (!source) {
      notify('Preview is not ready yet', 'info')
      return
    }
    notify('Preparing PDF…', 'info')
    try {
      await downloadPdf({ title, theme, source })
      notify('PDF downloaded')
    } catch (error) {
      console.error('PDF export failed', error)
      notify('Could not generate the PDF', 'info')
    }
  }, [notify, theme, title])

  const printPreview = useCallback(() => {
    setView('preview')
    window.setTimeout(() => window.print(), 200)
  }, [])

  const resetDocument = useCallback(() => {
    const confirmed = window.confirm(
      'Reset the document? Your current content will be replaced by the sample.',
    )
    if (!confirmed) return
    setContent(SAMPLE_DOCUMENT)
    setTitle('Welcome')
    notify('Document reset', 'info')
  }, [notify])

  const loadFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text()
        setContent(text)
        setTitle(file.name.replace(/\.(md|markdown|txt)$/i, ''))
        notify(`Loaded ${file.name}`)
      } catch {
        notify('Could not read that file', 'info')
      }
    },
    [notify],
  )

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (file) void loadFile(file)
    },
    [loadFile],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (!file) return
      if (isImageFile(file)) {
        notify('Images: use Ctrl/Cmd + V to paste them into the editor', 'info')
        return
      }
      void loadFile(file)
    },
    [loadFile, notify],
  )

  // Copy the share link directly (Ctrl/Cmd + Shift + L).
  const copyShareLink = useCallback(async () => {
    const url = buildShareUrl({ m: content, t: title || undefined })
    try {
      await navigator.clipboard.writeText(url)
      notify('Share link copied')
    } catch {
      setShareOpen(true)
    }
  }, [content, title, notify])

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return

      if (e.key === 's' && e.shiftKey) {
        e.preventDefault()
        void exportPdf()
      } else if (e.key === 's') {
        e.preventDefault()
        downloadMarkdown()
      } else if (e.key === 'k' && e.shiftKey) {
        e.preventDefault()
        setShareOpen(true)
      } else if (e.key === 'l' && e.shiftKey) {
        e.preventDefault()
        void copyShareLink()
      } else if (e.key === 'b') {
        e.preventDefault()
        setView((v) =>
          v === 'editor' ? 'preview' : v === 'preview' ? 'split' : 'editor',
        )
      } else if (e.key === 'j') {
        e.preventDefault()
        setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [downloadMarkdown, exportPdf, copyShareLink])

  const savedLabel = saveFailed
    ? 'Not saved — browser storage is full'
    : savedAt
      ? `Saved locally at ${savedAt.toLocaleTimeString()}`
      : 'Changes save automatically'

  return (
    <div
      className="flex h-full flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <Toolbar
        title={title}
        onTitleChange={setTitle}
        view={view}
        onViewChange={setView}
        theme={theme}
        onThemeToggle={() =>
          setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
        }
        wrap={wrap}
        onWrapToggle={() => setWrap((w) => !w)}
        sync={sync}
        onSyncToggle={() => setSync((s) => !s)}
        zen={zen}
        onZenToggle={() => setZen((z) => !z)}
        onCopyMarkdown={() => void copyMarkdown()}
        onCopyHtml={() => void copyHtml()}
        onCopyRich={() => void copyRich()}
        onOpenFile={() => document.getElementById('file-input')?.click()}
        onDownloadMarkdown={downloadMarkdown}
        onDownloadHtml={downloadHtml}
        onDownloadPdf={() => void exportPdf()}
        onPrint={printPreview}
        onShare={() => setShareOpen(true)}
        onReset={resetDocument}
      />

      <main className="min-h-0 flex-1">
        {view === 'split' && !zen ? (
          <SplitView
            ratio={split}
            onRatioChange={setSplit}
            left={
              <EditorPane
                value={content}
                theme={theme}
                wrap={wrap}
                onChange={setContent}
                onScrollRatio={onEditorScroll}
                scrollToRatioRef={scrollToEditor}
                onNotify={notify}
              />
            }
            right={
              <PreviewPane
                content={debouncedContent}
                theme={theme}
                onScrollRatio={onPreviewScroll}
                scrollToRatioRef={scrollToPreview}
                bodyRef={previewBodyRef}
              />
            }
          />
        ) : view === 'editor' && !zen ? (
          <EditorPane
            value={content}
            theme={theme}
            wrap={wrap}
            onChange={setContent}
            onNotify={notify}
          />
        ) : (
          <PreviewPane
            content={debouncedContent}
            theme={theme}
            bodyRef={previewBodyRef}
          />
        )}
      </main>

      {!zen && <StatusBar stats={stats} savedLabel={savedLabel} />}

      <Watermark />

      <input
        id="file-input"
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        className="hidden"
        onChange={onFileInput}
      />

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={title}
        content={content}
        onNotify={(msg) => notify(msg)}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
