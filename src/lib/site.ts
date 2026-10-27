/** Central site configuration used across SEO, exports and the watermark. */
export const SITE = {
  name: 'MDPreview Center',
  /** Fallback origin used before the runtime origin is known. */
  fallbackUrl: 'https://mdpreview.center.biz.id',
  tagline: 'Free online Markdown editor with live preview & shareable links',
  description:
    'Free online Markdown editor with instant live preview, Mermaid diagrams, KaTeX math, syntax highlighting and shareable links. Write, preview, export to PDF and share — no account required.',
  /** Keyword-rich tail appended to short auto-derived meta descriptions. */
  descriptionTail:
    'free online Markdown editor with live preview, Mermaid diagrams, KaTeX math and one-click PDF export',
  /** Absolute social-preview image, used by OG/Twitter and structured data. */
  ogImage: 'https://mdpreview.center.biz.id/og-image.png',
  /** Content pages linked from the app so crawlers can discover them. */
  pages: {
    guide: '/guide.html',
    privacy: '/privacy.html',
  },
  author: 'rifqysaputra.dev',
  authorName: 'Rifqy Saputra',
  twitter: '@rifqysaputra',
  /** Published / last-substantively-edited dates (schema.org, ISO date). */
  datePublished: '2026-10-07',
  dateModified: '2026-10-26',
  keywords: [
    'markdown editor',
    'markdown editor online',
    'markdown live preview',
    'online markdown editor',
    'markdown to pdf',
    'markdown preview',
    'markdown viewer',
    'markdown to html',
    'mermaid editor',
    'mermaid markdown',
    'markdown math katex',
    'free markdown editor',
    'markdown cheat sheet',
    'markdown share link',
    'github flavored markdown editor',
    'md file viewer',
    'markdown reader',
    'markdown preview editor',
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
