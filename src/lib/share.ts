import LZString from 'lz-string'

const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } =
  LZString

const HASH_KEY = 'md'

export interface SharePayload {
  /** Raw markdown source. */
  m: string
  /** Optional document title. */
  t?: string
}

/**
 * Encodes a payload into a URL-safe, compressed string (LZ-String) that can be
 * carried in the location hash. Compressed output is stored as-is inside the
 * hash, so nothing needs to be escaped beyond what LZ-String already does.
 */
export function encodeShare(payload: SharePayload): string {
  return compressToEncodedURIComponent(JSON.stringify(payload))
}

export function decodeShare(encoded: string): SharePayload | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    const parsed = JSON.parse(json) as Partial<SharePayload>
    if (typeof parsed?.m !== 'string') return null
    return { m: parsed.m, t: typeof parsed.t === 'string' ? parsed.t : undefined }
  } catch {
    return null
  }
}

/** Turns a title into a URL-safe slug (unicode friendly, keeps CJK). */
export function titleToSlug(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      // keep letters, numbers (incl. non-latin), spaces and dashes
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'document'
  )
}

/** Reads `#md=<data>` from a hash string and decodes it. */
export function readShareFromHash(hash: string): SharePayload | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null
  const params = new URLSearchParams(raw)
  const data = params.get(HASH_KEY)
  return data ? decodeShare(data) : null
}

/** Reads the document slug from a pathname like `/my-document-title`. */
export function readSlugFromPath(pathname: string): string | null {
  const segment = pathname.replace(/^\/+|\/+$/g, '').split('/').pop() ?? ''
  if (!segment) return null
  const decoded = decodeURIComponent(segment)
  // Ignore files/asset paths.
  if (/\.[a-z0-9]{2,5}$/i.test(decoded)) return null
  return decoded || null
}

/** Converts a slug back into a readable title (e.g. `my-doc` → `My Doc`). */
export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Builds a share URL that carries the document title in the path and the
 * compressed content in the hash:
 *
 *   https://mdpreview.vercel.app/my-document-title#md=N4IgxgLg...
 *
 * The path part makes the link readable and indexable, while the hash keeps
 * the actual content private (it is never sent to the server).
 */
export function buildShareUrl(payload: SharePayload, base?: string): string {
  const url = new URL(base ?? window.location.origin + '/')
  const slug = payload.t ? titleToSlug(payload.t) : ''
  url.pathname = slug ? `/${slug}` : '/'
  url.search = ''
  url.hash = `${HASH_KEY}=${encodeShare(payload)}`
  return url.toString()
}

/** Rough size, in characters, of the resulting share URL. */
export function shareUrlLength(payload: SharePayload, base?: string): number {
  return buildShareUrl(payload, base).length
}
