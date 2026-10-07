import { decodeShare, encodeShare, type SharePayload } from './share'
import { siteOrigin } from './site'

/**
 * Short links are backed by a free public paste service (dpaste.com) so the app
 * itself needs no backend, no database and no API keys — everything runs from
 * the static build on Vercel. The compressed document is uploaded once and the
 * service hands back a short id, which we expose as `<origin>/s/<id>`.
 *
 * Privacy note: unlike the `#md=` hash link (which never leaves the browser),
 * the contents of a short link are stored on dpaste.com until they expire.
 */
const PASTE_API = 'https://dpaste.com/api/v2/'
const PASTE_BASE = 'https://dpaste.com/'

/** How long an uploaded document stays available on the paste service. */
export const PASTE_EXPIRY_DAYS = 365

/** Matches our short-link path (`/s/<id>`) and returns the id, if any. */
export function shortIdFromPath(pathname: string): string | null {
  const match = /^\/s\/([A-Za-z0-9]{4,32})\/?$/.exec(pathname)
  return match ? match[1] : null
}

/** Uploads a document and returns a short `<origin>/s/<id>` link. */
export async function createShortLink(payload: SharePayload): Promise<string> {
  const body = new URLSearchParams({
    content: encodeShare(payload),
    expiry_days: String(PASTE_EXPIRY_DAYS),
    format: 'url',
  })

  const response = await fetch(PASTE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!response.ok) {
    throw new Error(`Paste service responded with ${response.status}`)
  }

  const text = (await response.text()).trim()
  const id = text.split('/').filter(Boolean).pop() ?? ''
  if (!/^[A-Za-z0-9]{4,32}$/.test(id)) {
    throw new Error('Unexpected response from the paste service')
  }
  return `${siteOrigin()}/s/${id}`
}

/** Downloads a previously uploaded document by its short id. */
export async function fetchShortLink(id: string): Promise<SharePayload | null> {
  const response = await fetch(`${PASTE_BASE}${encodeURIComponent(id)}.txt`)
  if (!response.ok) return null
  const encoded = (await response.text()).trim()
  return encoded ? decodeShare(encoded) : null
}
