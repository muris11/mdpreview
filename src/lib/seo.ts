import { SITE, siteOrigin } from './site'

function upsertMeta(
  selector: string,
  attr: 'name' | 'property',
  key: string,
  content: string,
) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/** Derives a short, human-friendly meta description from Markdown content. */
export function deriveDescription(markdown: string, maxLength = 160): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ') // code fences
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> text
    .replace(/^#{1,6}\s+/gm, ' ') // headings
    .replace(/^\s*[-*+]\s+/gm, ' ') // bullets
    .replace(/^\s*\d+\.\s+/gm, ' ') // ordered
    .replace(/[*_~>#|]/g, ' ') // leftover markers
    .replace(/\s+/g, ' ')
    .trim()

  if (plain.length <= maxLength) return plain
  return `${plain.slice(0, maxLength - 1).trimEnd()}…`
}

/** Builds a URL slug from a document title (unicode friendly). */
function toSlug(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'document'
  )
}

interface SeoOptions {
  title: string
  content: string
}

/**
 * Keeps the document head in sync with the current document so that search
 * engines and social crawlers see meaningful, unique metadata. Because the
 * app renders the document from the URL hash, Googlebot can index each titled
 * share page with its own title, description and structured data.
 */
export function applySeo({ title, content }: SeoOptions) {
  const origin = siteOrigin()
  const hasTitle = title.trim().length > 0

  const pageTitle = hasTitle
    ? `${title} — Markdown preview | ${SITE.name}`
    : `${SITE.name} — ${SITE.tagline}`
  const description = deriveDescription(content) || SITE.description

  document.title = pageTitle
  upsertMeta('meta[name="title"]', 'name', 'title', pageTitle)
  upsertMeta('meta[name="description"]', 'name', 'description', description)

  const canonical = hasTitle ? `${origin}/${toSlug(title)}` : `${origin}/`
  upsertLink('canonical', canonical)

  upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical)
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', pageTitle)
  upsertMeta(
    'meta[property="og:description"]',
    'property',
    'og:description',
    description,
  )
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle)
  upsertMeta(
    'meta[name="twitter:description"]',
    'name',
    'twitter:description',
    description,
  )

  // Refresh structured data with the document title.
  const ld = document.getElementById('dynamic-ld')
  const graph = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title || SITE.name,
    description,
    inLanguage: 'en',
    mainEntityOfPage: canonical,
    author: {
      '@type': 'Person',
      name: SITE.authorName,
      url: 'https://rifqysaputra.dev',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE.author,
      url: 'https://rifqysaputra.dev',
    },
  }
  if (ld) {
    ld.textContent = JSON.stringify(graph)
  } else {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'dynamic-ld'
    script.textContent = JSON.stringify(graph)
    document.head.appendChild(script)
  }
}
