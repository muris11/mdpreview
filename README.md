# MDPreview Center

> A modern Markdown editor with **live preview**, Mermaid diagrams, KaTeX math,
> syntax highlighting and **shareable links** — built with React, Vite & Tailwind.

A ground-up rebuild inspired by [markdown-live-preview](https://github.com/tanabe/markdown-live-preview),
reimagined with a modern stack and a few things the original never had.

🔗 **Live demo:** https://mdpreview.center.biz.id

---

## ✨ Features

| | |
| --- | --- |
| 📝 **Live preview** | Debounced, instant rendering while you type |
| 🌓 **Dark / light theme** | Follows your system, remembered per browser |
| 🔗 **Shareable links** | The whole document is compressed into the URL (LZ-String) — no server, no account |
| ⚡ **Short links** | **Create** turns any document into a compact `/s/abc123` link for chat — large documents are split into chunks and flaky uploads are retried automatically |
| 🧜 **Mermaid diagrams** | Flowcharts, sequence, gantt, class… lazily loaded |
| ➗ **KaTeX math** | Inline `$…$` and block `$$…$$` equations |
| 🎨 **Syntax highlighting** | 30+ languages via highlight.js |
| 🧩 **CodeMirror 6** | Fast, accessible editor with Markdown syntax highlighting |
| ↔️ **Resizable split view** | Editor-only / split / preview-only, drag to resize |
| 🔄 **Scroll sync** | Editor and preview scroll together |
| 📋 **Copy & export** | Copy Markdown / HTML / rich text, download `.md` / `.html` / **`.pdf`**, print |
| 📄 **Download as PDF** | One-click, styled PDF export with footer attribution |
| 📂 **Open files** | Load or drag-and-drop `.md` files |
| 🖼️ **Paste images** | `Ctrl/Cmd + V` puts the image straight into the document — uploaded to a free image host through our `/api/upload` endpoint (the browser can't reach those hosts directly), compressed to WebP and embedded as a data URL when offline |
| 📱 **Desktop layout everywhere** | Phones render the full desktop UI (same as "Request desktop site"), pinch to zoom |
| 💾 **Auto-save** | Content & preferences persisted in `localStorage` |
| 🎯 **Focus mode** | Hide the chrome and just write |
| 📊 **Status bar** | Word / character / line count and reading time |
| 🔍 **SEO optimised** | Per-document meta tags, Open Graph, Twitter cards, JSON-LD (WebApplication + FAQ + Article), sitemap & robots |
| 💧 **Watermark** | "built by rifqysaputra.dev" in the status-bar footer (desktop & mobile), exported HTML and every PDF page |

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + S` | Download `.md` |
| `Ctrl/Cmd + Shift + S` | Download `.pdf` |
| `Ctrl/Cmd + Shift + K` | Open the share dialog |
| `Ctrl/Cmd + Shift + L` | Copy the share link |
| `Ctrl/Cmd + B` | Cycle view mode |
| `Ctrl/Cmd + J` | Toggle theme |

---

## 🔗 How sharing works

Clicking **Share** serializes `{ title, markdown }` to JSON, compresses it with
[LZ-String](https://github.com/pieroxy/lz-string) and builds a readable URL that
puts the **document title in the path** and the **content in the hash**:

```
https://your-app.vercel.app/my-document-title#md=N4IgxgLg...
```

Anyone opening the link sees the exact same document. Because everything lives in
the fragment (`#…`), it is **never sent to a server** — the payload stays private
and the app stays fully static. The title in the path makes links readable and
gives each shared document a unique, indexable URL. Very large documents may
exceed what some chat apps allow in a URL; the dialog warns you when that happens.

### Short links

Hash links get long fast, so the share dialog also offers a **short link**
(`https://your-app/s/abc123`) created by **Create**:

- The compressed document is uploaded to [dpaste.com](https://dpaste.com) — a free
  paste service that needs no API key, no backend and no database, so the app
  stays a static build. It expires after `PASTE_EXPIRY_DAYS` (365).
- dpaste rejects pastes above roughly 90 000 characters, so bigger documents are
  **split into 40 000-character chunks behind a manifest** and reassembled on
  load. Single-chunk links keep working as before.
- `429`, `5xx` and offline responses are **retried with backoff** before giving
  up, and failures are reported with the real cause (rate limited / offline /
  rejected) plus a **Try again** button instead of a generic error.
- ⚠️ **Privacy:** unlike the `#md=` link, a short link's contents do leave the
  browser and are stored on dpaste.com until they expire. Use the full link when
  the document is private.

Reading one needs no routing: `vercel.json` rewrites `/s/<id>` to `index.html`,
`shortIdFromPath()` picks the id out of the location, and `fetchShortLink()`
downloads the chunks straight into the browser before the first paint of the
document.

---

## 🔍 SEO notes

The app ships with a full SEO setup that keeps working after deployment:

- **Rich meta tags** in `index.html`: title, description, keywords, robots,
  canonical, Open Graph and Twitter cards.
- **Dynamic per-document SEO** (`src/lib/seo.ts`): the `<title>`, description,
  canonical URL, OG/Twitter tags and a JSON-LD `Article` node update live as the
  document title or content changes.
- **Structured data**: `WebApplication`, `SoftwareApplication`, `WebSite`,
  `BreadcrumbList` and `FAQPage` (eligible for rich results).
- **Crawlable fallback content** + a `<noscript>` block so search engines always
  find meaningful text even without JavaScript.
- **`robots.txt`** and **`sitemap.xml`** for clean crawling and indexing.
- **`og-image.png`** (1200×630) for attractive link previews.

> **After deploying**, update the domain in `src/lib/site.ts` (`fallbackUrl`),
> `public/robots.txt` and `public/sitemap.xml` if you use a custom domain, then
> submit the site to [Google Search Console](https://search.google.com/search-console)
> and [Bing Webmaster Tools](https://www.bing.com/webmasters).

---

## 🖼️ Regenerating icons

All favicons, PWA icons and the social preview image are generated from
`public/icon.png`:

```bash
node scripts/generate-assets.mjs
```


---

## 🚀 Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type check (tsc -b) + production build → dist/
npm run preview  # preview the production build
npm run lint     # oxlint
```

There is no test suite: `npm run build` doubling as the type check is the gate
that keeps a bad push out of the repository.

Requires Node.js 20+.

---

## ☁️ Deploy to Vercel

1. Push this repository to GitHub.
2. On [vercel.com](https://vercel.com) → **Add New… → Project** → import the repo.
3. Vercel auto-detects Vite. Confirm the settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. **Deploy.** Done — no environment variables needed.

The included [`vercel.json`](./vercel.json) adds a SPA rewrite so deep links keep
working.

---

## 🧱 Tech stack

- **React 19** + **TypeScript**
- **Vite** (Rolldown-powered)
- **Tailwind CSS v4**
- **CodeMirror 6** (`@uiw/react-codemirror`)
- **markdown-it** + plugins (anchors, footnotes, task lists, KaTeX math)
- **Mermaid**, **KaTeX**, **highlight.js**
- **DOMPurify** for sanitizing rendered HTML
- **lz-string** for share links

---

## 📁 Project structure

```
api/
└─ upload.ts          # image upload endpoint (Vercel function)
src/
├─ components/        # Toolbar, EditorPane, PreviewPane, SplitView, ShareDialog,
│                     # StatusBar, ToastStack, Watermark
├─ hooks/             # useDebouncedValue, useToasts
├─ lib/
│  ├─ markdown.ts     # markdown-it configuration
│  ├─ sanitize.ts     # DOMPurify allow-lists (SVG + MathML)
│  ├─ mermaid.ts      # lazy mermaid renderer
│  ├─ highlight.ts    # highlight.js setup
│  ├─ share.ts        # LZ-String encode/decode + readable share URLs
│  ├─ shortlink.ts    # /s/<id> links on dpaste.com (chunked + retried)
│  ├─ images.ts       # paste-to-insert images (upload + WebP data URL fallback)
│  ├─ seo.ts          # live per-document meta tags + JSON-LD
│  ├─ site.ts         # site name, origin, watermark
│  ├─ storage.ts      # localStorage helpers
│  ├─ export.ts       # standalone HTML export
│  ├─ pdf.ts          # styled PDF export
│  ├─ sample.ts       # welcome document
│  ├─ utils.ts        # small formatting helpers
│  └─ languages.ts    # curated CodeMirror grammars
├─ App.tsx
└─ index.css          # Tailwind theme + markdown styles
```

Locally, `vite.config.ts` registers the same `/api/upload` handler as middleware,
so `npm run dev` and `npm run preview` upload images exactly like production.

---

## 🙏 Credits

Inspired by [tanabe/markdown-live-preview](https://github.com/tanabe/markdown-live-preview).
Rewritten from scratch with a modern toolchain.

## 📄 License

[MIT](./LICENSE)
