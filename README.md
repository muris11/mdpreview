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
| 📋 **Copy & export** | Copy Markdown / HTML / rich text, download `.md` or standalone `.html`, print to PDF |
| 📂 **Open files** | Load or drag-and-drop `.md` files |
| 💾 **Auto-save** | Content & preferences persisted in `localStorage` |
| 🎯 **Focus mode** | Hide the chrome and just write |
| 📊 **Status bar** | Word / character / line count and reading time |

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + S` | Download `.md` |
| `Ctrl/Cmd + Shift + K` | Open the share dialog |
| `Ctrl/Cmd + B` | Cycle view mode |
| `Ctrl/Cmd + J` | Toggle theme |

---

## 🔗 How sharing works

Clicking **Share** serializes `{ title, markdown }` to JSON, compresses it with
[LZ-String](https://github.com/pieroxy/lz-string) and puts it in the URL hash:

```
https://your-app.vercel.app/#md=N4IgxgLg...
```

Anyone opening the link sees the exact same document. Because everything lives in
the fragment (`#…`), it is **never sent to a server** — the payload stays private
and the app stays fully static. Very large documents may exceed what some chat
apps allow in a URL; the dialog warns you when that happens.

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
src/
├─ components/       # Toolbar, EditorPane, PreviewPane, ShareDialog, …
├─ hooks/            # useDebouncedValue, useToasts
├─ lib/
│  ├─ markdown.ts    # markdown-it configuration
│  ├─ sanitize.ts    # DOMPurify allow-lists (SVG + MathML)
│  ├─ mermaid.ts     # lazy mermaid renderer
│  ├─ share.ts       # LZ-String encode/decode
│  ├─ storage.ts     # localStorage helpers
│  ├─ export.ts      # standalone HTML export
│  └─ languages.ts   # curated CodeMirror grammars
├─ App.tsx
└─ index.css         # Tailwind theme + markdown styles
```

---

## 🙏 Credits

Inspired by [tanabe/markdown-live-preview](https://github.com/tanabe/markdown-live-preview).
Rewritten from scratch with a modern toolchain.

## 📄 License

[MIT](./LICENSE)
