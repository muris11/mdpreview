# MDPreview Center

> A modern Markdown editor with **live preview**, Mermaid diagrams, KaTeX math,
> syntax highlighting and **shareable links** — built with React, Vite & Tailwind.

A ground-up rebuild inspired by [markdown-live-preview](https://github.com/tanabe/markdown-live-preview),
reimagined with a modern stack and a few things the original never had.

🔗 **Live demo:** _add your Vercel URL here after deploying_

---

## ✨ Features

| | |
| --- | --- |
| 📝 **Live preview** | Debounced, instant rendering while you type |
| 🌓 **Dark / light theme** | Follows your system, remembered per browser |
| 🔗 **Shareable links** | The whole document is compressed into the URL (LZ-String) — no server, no account |
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
npm run build    # production build → dist/
npm run preview  # preview the production build
npm run lint     # oxlint
```

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
├─ components/       # Toolbar, EditorPane, PreviewPane, ShareDialog, …
├─ hooks/            # useDebouncedValue, useToasts
├─ lib/
│  ├─ markdown.ts    # markdown-it configuration
│  ├─ sanitize.ts    # DOMPurify allow-lists (SVG + MathML)
│  ├─ mermaid.ts     # lazy mermaid renderer
│  ├─ share.ts       # LZ-String encode/decode
│  ├─ images.ts      # paste-to-insert images (upload + WebP data URL fallback)
│  ├─ storage.ts     # localStorage helpers
│  ├─ export.ts      # standalone HTML export
│  └─ languages.ts   # curated CodeMirror grammars
├─ App.tsx
└─ index.css         # Tailwind theme + markdown styles
```

Locally, `vite.config.ts` registers the same `/api/upload` handler as middleware,
so `npm run dev` and `npm run preview` upload images exactly like production.

---

## 🙏 Credits

Inspired by [tanabe/markdown-live-preview](https://github.com/tanabe/markdown-live-preview).
Rewritten from scratch with a modern toolchain.

## 📄 License

[MIT](./LICENSE)
