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

/**
 * Meta descriptions below ~70 characters read as an accident in the SERP and
 * waste the snippet, so short derivations get a keyword-rich tail appended.
 */
function withFallbackDescription(derived: string): string {
  const tail = SITE.descriptionTail
  if (derived.length >= 120) return derived.slice(0, 160)
  if (!derived) return SITE.description
  const joined = `${derived.replace(/\s+$/, '')} — ${tail}`
  return joined.length <= 160 ? joined : `${joined.slice(0, 159).trimEnd()}…`
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

/** Short links are user-generated pastes; keep them out of the index. */
function isShortLinkPath(pathname: string): boolean {
  return /^\/s\/[^/]+\/?$/.test(pathname)
}

interface SeoOptions {
  title: string
  content: string
  /**
   * True when the page is showing a shared document (hash link or `/s/` short
   * link) rather than whatever happens to be in the visitor's own browser.
   * Only shared documents get their own canonical URL — a locally authored
   * document lives at a path nobody else can reproduce, so it canonicalises
   * to the home page instead of polluting the index with thin duplicates.
   */
  shared?: boolean
}

/**
 * Keeps the document head in sync with the current document so that search
 * engines and social crawlers see meaningful, unique metadata. Because the
 * app renders the document from the URL hash, Googlebot can index each titled
 * share page with its own title, description and structured data.
 */
export function applySeo({ title, content, shared = false }: SeoOptions) {
  const origin = siteOrigin()
  const hasTitle = title.trim().length > 0
  const shortLink = isShortLinkPath(window.location.pathname)

  const pageTitle = hasTitle
    ? `${title} — Markdown preview | ${SITE.name}`
    : `${SITE.name} — ${SITE.tagline}`
  const description = withFallbackDescription(deriveDescription(content))

  document.title = pageTitle
  upsertMeta('meta[name="title"]', 'name', 'title', pageTitle)
  upsertMeta('meta[name="description"]', 'name', 'description', description)

  // A short link is a private paste shared with a few people: render it for
  // humans but keep it out of the index. Everything else stays indexable.
  upsertMeta(
    'meta[name="robots"]',
    'name',
    'robots',
    shortLink
      ? 'noindex, nofollow, max-snippet:-1'
      : 'index, follow, max-image-preview:large, max-snippet:-1',
  )

  const path = hasTitle ? `/${toSlug(title)}` : '/'
  const canonical = `${origin}${path}`
  upsertLink('canonical', canonical)

  const ogType = shared ? 'article' : 'website'
  upsertMeta('meta[property="og:type"]', 'property', 'og:type', ogType)
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical)
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', pageTitle)
  upsertMeta(
    'meta[property="og:description"]',
    'property',
    'og:description',
    description,
  )
  upsertMeta('meta[property="og:image"]', 'property', 'og:image', SITE.ogImage)
  upsertMeta(
    'meta[property="og:image:alt"]',
    'property',
    'og:image:alt',
    `${pageTitle} — preview`,
  )
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle)
  upsertMeta(
    'meta[name="twitter:description"]',
    'name',
    'twitter:description',
    description,
  )
  upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', SITE.ogImage)

  // Refresh structured data with the document title.
  const graph: Record<string, unknown>[] = []
  const modified = new Date().toISOString().slice(0, 10)
  const words = content.trim() ? content.trim().split(/\s+/).length : 0

  if (shared && hasTitle) {
    graph.push({
      '@type': 'Article',
      headline: title.slice(0, 110),
      description,
      inLanguage: 'en',
      url: canonical,
      mainEntityOfPage: canonical,
      dateModified: modified,
      wordCount: words,
      author: { '@id': 'https://rifqysaputra.dev/#person' },
      publisher: { '@id': 'https://mdpreview.center.biz.id/#organization' },
      isAccessibleForFree: true,
    })
  } else {
    graph.push({
      '@type': 'WebPage',
      name: pageTitle,
      description,
      url: `${origin}/`,
      inLanguage: 'en',
      dateModified: modified,
      isPartOf: { '@id': 'https://mdpreview.center.biz.id/#website' },
      primaryImageOfPage: { '@type': 'ImageObject', url: SITE.ogImage },
    })
  }

  const ld = document.getElementById('dynamic-ld')
  const payload = {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
  if (ld) {
    ld.textContent = JSON.stringify(payload)
  } else {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'dynamic-ld'
    script.textContent = JSON.stringify(payload)
    document.head.appendChild(script)
  }
}
