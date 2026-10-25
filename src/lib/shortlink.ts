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

/**
 * The service answers 400 for pastes above roughly 90 000 characters, so longer
 * documents are uploaded as chunks plus a manifest and reassembled on read.
 */
const CHUNK_LIMIT = 40_000

/** Transient failures (429, 5xx, offline) are retried before giving up. */
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 700

export type ShortLinkErrorCode = 'network' | 'rate-limited' | 'rejected'

export interface ShortLinkError extends Error {
  code: ShortLinkErrorCode
}

function fail(code: ShortLinkErrorCode, message: string): never {
  const error = new Error(message) as ShortLinkError
  error.code = code
  throw error
}

/** Reads the code back off a failed `createShortLink`/`fetchShortLink`. */
export function shortLinkErrorCode(error: unknown): ShortLinkErrorCode | null {
  const code = (error as ShortLinkError | null | undefined)?.code
  return code === 'network' || code === 'rate-limited' || code === 'rejected'
    ? code
    : null
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

/** Matches our short-link path (`/s/<id>`) and returns the id, if any. */
export function shortIdFromPath(pathname: string): string | null {
  const match = /^\/s\/([A-Za-z0-9]{4,32})\/?$/.exec(pathname)
  return match ? match[1] : null
}

/** Uploads one chunk and returns its short id, retrying transient failures. */
async function uploadPaste(content: string): Promise<string> {
  const body = new URLSearchParams({
    content,
    expiry_days: String(PASTE_EXPIRY_DAYS),
    format: 'url',
  })

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response: Response
    try {
      response = await fetch(PASTE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
    } catch {
      if (attempt === MAX_ATTEMPTS) fail('network', 'Paste service unreachable')
      await wait(RETRY_DELAY_MS * attempt)
      continue
    }

    if (response.ok) {
      const text = (await response.text()).trim()
      const id = text.split('/').filter(Boolean).pop() ?? ''
      if (/^[A-Za-z0-9]{4,32}$/.test(id)) return id
      fail('rejected', 'Unexpected response from the paste service')
    }

    // 429/5xx are worth another try; anything else (400, 403…) will not change.
    const transient = response.status === 429 || response.status >= 500
    if (!transient || attempt === MAX_ATTEMPTS) {
      if (response.status === 429) {
        fail('rate-limited', 'Paste service is rate limiting requests')
      }
      fail('rejected', `Paste service responded with ${response.status}`)
    }
    await wait(RETRY_DELAY_MS * attempt)
  }

  fail('network', 'Paste service unreachable')
}

/** Splits an oversized payload into chunks, ending with a manifest chunk. */
async function uploadChunked(encoded: string): Promise<string> {
  const parts: string[] = []
  for (let i = 0; i < encoded.length; i += CHUNK_LIMIT) {
    parts.push(await uploadPaste(encoded.slice(i, i + CHUNK_LIMIT)))
  }
  const manifest: { v: 1; parts: string[] } = { v: 1, parts }
  const encodedManifest = JSON.stringify(manifest)
  // Absurdly large documents would produce a manifest the service rejects too.
  if (encodedManifest.length > CHUNK_LIMIT) {
    fail('rejected', 'Document is too large for a short link')
  }
  return uploadPaste(encodedManifest)
}

/** Uploads a document and returns a short `<origin>/s/<id>` link. */
export async function createShortLink(payload: SharePayload): Promise<string> {
  const encoded = encodeShare(payload)
  const id =
    encoded.length <= CHUNK_LIMIT
      ? await uploadPaste(encoded)
      : await uploadChunked(encoded)
  return `${siteOrigin()}/s/${id}`
}

/** Downloads raw paste text, retrying before concluding it is gone. */
async function downloadPaste(id: string): Promise<string | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(
        `${PASTE_BASE}${encodeURIComponent(id)}.txt`,
      )
      if (response.ok) return (await response.text()).trim()
      if (response.status !== 429 && response.status < 500) return null
    } catch {
      /* offline / DNS blip — retried below */
    }
    if (attempt < MAX_ATTEMPTS) await wait(RETRY_DELAY_MS * attempt)
  }
  return null
}

/**
 * Recognises a multi-chunk manifest. LZ-String output never contains `{` or
 * `"`, so this can never collide with a regular (single chunk) payload.
 */
function readManifest(raw: string): string[] | null {
  if (!raw.startsWith('{')) return null
  try {
    const value = JSON.parse(raw) as { v?: unknown; parts?: unknown }
    if (value?.v !== 1 || !Array.isArray(value.parts)) return null
    const parts = value.parts
    if (!parts.every((part) => /^[A-Za-z0-9]{4,32}$/.test(String(part)))) {
      return null
    }
    return parts as string[]
  } catch {
    return null
  }
}

/** Downloads a previously uploaded document by its short id. */
export async function fetchShortLink(id: string): Promise<SharePayload | null> {
  const raw = await downloadPaste(id)
  if (!raw) return null

  const parts = readManifest(raw)
  if (!parts) return decodeShare(raw)

  let encoded = ''
  for (const part of parts) {
    const chunk = await downloadPaste(part)
    if (!chunk) return null
    encoded += chunk
  }
  return encoded ? decodeShare(encoded) : null
}
