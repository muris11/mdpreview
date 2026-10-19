/**
 * Image upload endpoint — the server side of Ctrl/Cmd+V.
 *
 * The browser cannot talk to the free image hosts directly (CORS), so pasted
 * images are posted here as base64 JSON and forwarded server-side to
 * catbox.moe. No database, no API keys: the file ends up on a free public host
 * and we only return its URL.
 *
 * Runs as a Vercel function in production, and behind the middleware installed
 * in `vite.config.ts` on `npm run dev` / `npm run preview` — both environments
 * execute this exact code path.
 */

/** ≈ 4.2 MB of image data — Vercel caps request bodies at 4.5 MB. */
const MAX_BASE64_CHARS = 4_200_000
const CATBOX_API = 'https://catbox.moe/user/api.php'
const CATBOX_URL = /^https:\/\/files\.catbox\.moe\/\S+$/i
const FORWARD_TIMEOUT_MS = 20_000
const IMAGE_MIME = /^image\/(?:png|jpe?g|gif|webp|avif|bmp|svg\+xml)$/
const EXTENSION: Record<string, string> = {
  png: 'png',
  jpeg: 'jpg',
  jpg: 'jpg',
  gif: 'gif',
  webp: 'webp',
  avif: 'avif',
  bmp: 'bmp',
  'svg+xml': 'svg',
}

/** Rejected uploads throw this; callers translate it into a 400. */
export class UploadRejected extends Error {}

interface UploadBody {
  base64: string
  mime: string
  /** File name including an extension that matches the mime type. */
  name: string
}

export interface UploadResult {
  status: number
  payload: unknown
}

/** Validates and normalises the JSON body shared by both entry points. */
function parseBody(body: unknown): UploadBody {
  const record = (
    typeof body === 'object' && body !== null ? body : {}
  ) as Record<string, unknown>

  const mime = typeof record.mime === 'string' ? record.mime : ''
  if (!IMAGE_MIME.test(mime)) throw new UploadRejected('Only images can be uploaded')

  const base64 = typeof record.data === 'string' ? record.data.replace(/\s/g, '') : ''
  if (!base64) throw new UploadRejected('The image data is missing')
  if (base64.length > MAX_BASE64_CHARS) {
    throw new UploadRejected('That image is too large — paste a smaller one')
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new UploadRejected('The image data is not valid base64')
  }

  const subtype = mime.slice(mime.indexOf('/') + 1)
  const rawName =
    typeof record.name === 'string'
      ? record.name.replace(/[^\w.\- ]/g, '').replace(/\.[^.]*$/, '').slice(0, 60)
      : ''
  return { base64, mime, name: `${rawName || 'image'}.${EXTENSION[subtype] ?? 'png'}` }
}

/** Forwards the decoded image to catbox.moe and returns its public URL. */
async function forward({ base64, mime, name }: UploadBody): Promise<string> {
  const bytes = Buffer.from(base64, 'base64')
  if (!bytes.byteLength) throw new UploadRejected('That image is empty')

  const form = new FormData()
  form.append('reqtype', 'fileupload')
  form.append('fileToUpload', new Blob([bytes], { type: mime }), name)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS)
  try {
    const response = await fetch(CATBOX_API, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`image host responded with ${response.status}`)
    }
    const url = (await response.text()).trim()
    if (!CATBOX_URL.test(url)) throw new Error('unexpected response from the image host')
    return url
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Shared handler: takes a parsed JSON body and resolves to a status code plus
 * payload, so the Vercel function and the local middleware behave identically.
 */
export async function handleUpload(body: unknown): Promise<UploadResult> {
  let upload: UploadBody
  try {
    upload = parseBody(body)
  } catch (error) {
    return {
      status: 400,
      payload: {
        error: error instanceof Error ? error.message : 'Invalid upload request',
      },
    }
  }

  try {
    return { status: 200, payload: { url: await forward(upload) } }
  } catch (error) {
    console.error('image upload failed:', error)
    return {
      status: 502,
      payload: { error: 'The image host rejected the upload — try again' },
    }
  }
}

/* --- Vercel entry point ------------------------------------------------- */

interface ApiRequest {
  method?: string
  body?: unknown
}

interface ApiResponse {
  status(code: number): ApiResponse
  json(payload: unknown): void
  setHeader(name: string, value: string): void
}

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
): Promise<void> {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ error: 'Method not allowed' })
    return
  }
  const { status, payload } = await handleUpload(request.body)
  response.status(status).json(payload)
}
