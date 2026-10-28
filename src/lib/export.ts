import hljsThemeLight from 'highlight.js/styles/github.css?raw'
import katexCss from 'katex/dist/katex.min.css?raw'
import { WATERMARK_TEXT, WATERMARK_URL } from './site'

const HLJS_DARK_CSS = `
.hljs{color:#c9d1d9;background:transparent}
.hljs-doctag,.hljs-keyword,.hljs-meta .hljs-keyword,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language_{color:#ff7b72}
.hljs-title,.hljs-title.class_,.hljs-title.class_.inherited__,.hljs-title.function_{color:#d2a8ff}
.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-variable,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id{color:#79c0ff}
.hljs-regexp,.hljs-string,.hljs-meta .hljs-string{color:#a5d6ff}
.hljs-built_in,.hljs-symbol{color:#ffa657}
.hljs-comment,.hljs-code,.hljs-formula{color:#8b949e}
.hljs-name,.hljs-quote,.hljs-selector-pseudo,.hljs-selector-tag{color:#7ee787}
.hljs-subst{color:#c9d1d9}
.hljs-section{color:#1f6feb;font-weight:700}
.hljs-bullet{color:#f2cc60}
.hljs-emphasis{color:#c9d1d9;font-style:italic}
.hljs-strong{color:#c9d1d9;font-weight:700}
.hljs-addition{color:#aff5b4;background-color:#033a16}
.hljs-deletion{color:#ffdcd7;background-color:#67060c}
`

/** Keeps a document title from breaking the exported document's markup. */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

/**
 * Wraps rendered HTML into a standalone document with inlined styles so the
 * exported file looks right when opened offline. Includes an attribution
 * watermark in the footer.
 */
export function buildStandaloneHtml(
  title: string,
  bodyHtml: string,
  theme: 'dark' | 'light',
): string {
  const isDark = theme === 'dark'
  const bg = isDark ? '#0b0f17' : '#ffffff'
  const fg = isDark ? '#e6ecf7' : '#161e30'
  const codeBg = isDark ? '#0d1220' : '#f6f8fc'
  const border = isDark ? '#232e47' : '#dbe3f0'
  const muted = isDark ? '#8b9cc0' : '#64749b'

  return `<!doctype html>
<html lang="en"${isDark ? ' class="dark"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title) || 'Document'}</title>
<style>
${katexCss}
${hljsThemeLight}
${isDark ? HLJS_DARK_CSS : ''}
:root { color-scheme: ${isDark ? 'dark' : 'light'}; }
body {
  margin: 0;
  background: ${bg};
  color: ${fg};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.75;
  font-size: 16px;
}
.markdown-body { max-width: 820px; margin: 0 auto; padding: 48px 24px 96px; }
.markdown-body h1, .markdown-body h2 { border-bottom: 1px solid ${border}; padding-bottom: .3em; }
.markdown-body h1, .markdown-body h2, .markdown-body h3,
.markdown-body h4, .markdown-body h5, .markdown-body h6 { margin-top: 1.6em; margin-bottom: .6em; line-height: 1.3; }
.markdown-body a { color: #0b7fe0; }
.markdown-body code {
  background: ${codeBg}; padding: .15em .4em; border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; font-size: .88em;
}
.markdown-body pre {
  background: ${codeBg}; border: 1px solid ${border}; border-radius: 12px;
  padding: 16px; overflow-x: auto;
}
.markdown-body pre code { background: none; padding: 0; }
.markdown-body blockquote {
  margin: 0 0 1em; padding: 8px 16px; border-left: 4px solid #1f9dff;
  background: ${isDark ? 'rgba(31,157,255,.08)' : 'rgba(31,157,255,.05)'}; border-radius: 0 8px 8px 0;
}
.markdown-body img { max-width: 100%; border-radius: 12px; }
.markdown-body table { border-collapse: collapse; display: block; overflow-x: auto; max-width: 100%; }
.markdown-body th, .markdown-body td { border: 1px solid ${border}; padding: 8px 12px; }
.markdown-body th { background: ${isDark ? 'rgba(255,255,255,.05)' : '#eef2f9'}; }
.markdown-body hr { border: 0; height: 1px; background: ${border}; margin: 2em 0; }
.markdown-body .mermaid { text-align: center; margin: 1em 0; }
.markdown-body li.task-list-item { list-style: none; margin-left: -1.5em; }
.markdown-body .anchor { display: none; }
.watermark {
  max-width: 820px; margin: 0 auto; padding: 0 24px 48px;
  color: ${muted}; font-size: 13px; text-align: center;
}
.watermark a { color: #0b7fe0; text-decoration: none; font-weight: 600; }
@media print { body { background: #fff; color: #000; } .markdown-body { padding-bottom: 24px; } }
</style>
</head>
<body>
<article class="markdown-body">
${bodyHtml}
</article>
<footer class="watermark">
  <a href="${WATERMARK_URL}" target="_blank" rel="noopener">${WATERMARK_TEXT}</a>
</footer>
</body>
</html>`
}

/** Copies rich text (HTML + plain text) so pasting into docs keeps formatting. */
export async function copyRichText(html: string, plain: string): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      }),
    ])
    return
  }
  await navigator.clipboard.writeText(plain)
}
