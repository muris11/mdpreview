/** Central site configuration used across SEO, exports and the watermark. */
export const SITE = {
  name: 'MDPreview Center',
  /** Fallback origin used before the runtime origin is known. */
  fallbackUrl: 'https://mdpreview.center.biz.id',
  tagline: 'Free online Markdown editor with live preview & shareable links',
  description:
    'Free online Markdown editor with instant live preview, Mermaid diagrams, KaTeX math, syntax highlighting and shareable links. Write, preview, export to PDF and share — no account required.',
  author: 'rifqysaputra.dev',
  authorName: 'Rifqy Saputra',
  twitter: '@rifqysaputra',
  keywords: [
    'markdown editor',
    'markdown live preview',
    'online markdown editor',
    'markdown to pdf',
    'markdown preview',
    'mermaid editor',
    'markdown math katex',
    'free markdown editor',
    'markdown viewer',
    'share markdown link',
  ],
} as const

/** The live site origin (adapts to whatever domain the app is deployed on). */
export function siteOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }
  return SITE.fallbackUrl
}

export const WATERMARK_TEXT = 'built by rifqysaputra.dev'
export const WATERMARK_URL = 'https://rifqysaputra.dev'
