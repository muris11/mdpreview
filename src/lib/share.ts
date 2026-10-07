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

/** Reads `#md=<data>` from a hash string and decodes it. */
export function readShareFromHash(hash: string): SharePayload | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null
  const params = new URLSearchParams(raw)
  const data = params.get(HASH_KEY)
  return data ? decodeShare(data) : null
}

export function buildShareUrl(payload: SharePayload, base?: string): string {
  const url = new URL(base ?? window.location.href)
  url.hash = `${HASH_KEY}=${encodeShare(payload)}`
  return url.toString()
}

/** Rough size, in characters, of the resulting share URL. */
export function shareUrlLength(payload: SharePayload, base?: string): number {
  return buildShareUrl(payload, base).length
}
