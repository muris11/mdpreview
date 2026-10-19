/**
 * Image paste support (Ctrl/Cmd + V).
 *
 * The browser cannot reach the free image hosts directly (CORS), so a pasted
 * image is first posted to our own `/api/upload` endpoint, which forwards it
 * server-side to catbox.moe and hands back a permanent URL. If that fails we
 * try the host straight from the browser, and as a last resort the image is
 * embedded as a compressed `data:` URL — a paste never silently loses a
 * picture, and the document stays small in every case.
 *
 * While an upload runs, a hidden HTML-comment placeholder marks the spot in the
 * document, so the cursor position and the document order are preserved. It is
 * swapped for the final `![alt](url)` as soon as the image has a home.
 */

import { formatBytes } from './utils'

export type ImageTone = 'success' | 'info'

export interface ImageTarget {
  /** Inserts markdown at the current cursor position. */
  insert: (markdown: string) => void
  /** Swaps a previously inserted placeholder for the final markdown. */
  replace: (placeholder: string, markdown: string) => void
}

type Notify = (text: string, tone?: ImageTone) => void

interface AddResult {
  status: 'hosted' | 'embedded' | 'failed'
  url?: string
  bytes?: number
}

const OWN_API = '/api/upload'
/** Our endpoint is capped at ~4.2 MB of image data; don't bother sending more. */
const OWN_API_MAX_CHARS = 4_000_000
const OWN_API_TIMEOUT_MS = 15_000
const DIRECT_TIMEOUT_MS = 20_000
/** Originals up to this size are uploaded untouched — crisp beats compact. */
const UPLOAD_AS_IS_BYTES = 2_800_000
/** PNG/JPEG above this size are re-encoded to WebP before being embedded. */
const COMPRESS_ABOVE = 150_000
/** Inline (data URL) passes stop once the image is comfortably small. */
const INLINE_TARGET = 400_000
/** Only these are re-encoded — animated GIFs and SVGs must not be rasterised. */
const REENCODABLE = /^image\/(?:png|jpeg)$/
const REENCODABLE_INLINE = /^image\/(?:png|jpeg|webp)$/

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () =>
      reject(reader.error ?? new Error('Could not read the image'))
    reader.readAsDataURL(file)
  })
}

/** Raw base64 (no `data:` prefix) of the file's current bytes. */
async function toBase64(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file)
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

/**
 * Adds every pasted image to the document and reports what happened.
 * Uploads run in parallel; placeholders are inserted up-front, in order.
 */
export async function pasteImageFiles(
  files: File[],
  target: ImageTarget,
  notify: Notify,
): Promise<void> {
  const images = files.filter(isImageFile)
  if (!images.length) return

  notify(
    images.length > 1 ? `Adding ${images.length} images…` : 'Adding image…',
    'info',
  )

  const results = await Promise.all(images.map((file) => add(file, target)))

  const hosted = results.filter((result) => result.status === 'hosted')
  const embedded = results.filter((result) => result.status === 'embedded')
  const failed = results.filter((result) => result.status === 'failed')

  if (hosted.length) {
    const hosts = [...new Set(hosted.map((result) => hostOf(result.url)))]
    const plural = hosted.length > 1 ? `${hosted.length} images` : 'Image'
    notify(`${plural} added — hosted on ${hosts.join(', ')}`)
  }
  if (embedded.length) {
    const bytes = embedded.reduce((sum, result) => sum + (result.bytes ?? 0), 0)
    notify(
      embedded.length > 1
        ? `Upload unavailable — embedded as data URLs (${formatBytes(bytes)}), the document is larger now`
        : `Upload unavailable — embedded as a data URL (${formatBytes(bytes)}), the document is larger now`,
      'info',
    )
  }
  if (failed.length) {
    notify("Couldn't add that image", 'info')
  }
}

async function add(file: File, target: ImageTarget): Promise<AddResult> {
  const mark = `<!-- mdprev-img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)} -->`
  target.insert(`\n${mark}\n`)

  const compressed = await compressImage(file)
  const uploadable = file.size <= UPLOAD_AS_IS_BYTES ? file : compressed

  try {
    const url = await uploadImage(uploadable)
    target.replace(mark, `![${altFor(file)}](${url})`)
    return { status: 'hosted', url }
  } catch {
    // Offline or every host refused — keep the picture, but compact enough
    // that the document stays usable.
    const inline = await shrinkForInline(compressed)
    try {
      const dataUrl = await fileToDataUrl(inline)
      target.replace(mark, `![${altFor(file)}](${dataUrl})`)
      return { status: 'embedded', bytes: inline.size }
    } catch {
      target.replace(mark, '')
      return { status: 'failed' }
    }
  }
}

/** Tries each upload path in turn and returns the first usable URL. */
async function uploadImage(file: File): Promise<string> {
  for (const upload of [uploadViaOwnApi, uploadDirect]) {
    try {
      const url = await upload(file)
      if (/^https?:\/\/\S+$/i.test(url)) return url
    } catch {
      /* try the next way in */
    }
  }
  throw new Error('No image host accepted the upload')
}

/** Preferred path: our own endpoint forwards to the host server-side. */
async function uploadViaOwnApi(file: File): Promise<string> {
  let payload = file
  let base64 = await toBase64(payload)
  // The endpoint caps request bodies; shrink until the image fits so even a
  // huge paste ends up as a hosted link instead of a data URL in the document.
  for (const [quality, maxEdge] of [
    [0.7, 1280],
    [0.55, 1024],
  ] as const) {
    if (base64.length <= OWN_API_MAX_CHARS) break
    const smaller = await reencode(payload, quality, maxEdge)
    if (!smaller || smaller.size >= payload.size) break
    payload = smaller
    base64 = await toBase64(payload)
  }
  if (!base64 || base64.length > OWN_API_MAX_CHARS) {
    throw new Error('That image is too large for the upload endpoint')
  }

  const response = await request(
    OWN_API,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mime: payload.type, name: payload.name, data: base64 }),
    },
    OWN_API_TIMEOUT_MS,
  )
  if (!response.ok) {
    throw new Error(`Upload endpoint responded with ${response.status}`)
  }
  const json = (await response.json()) as { url?: unknown }
  if (typeof json.url !== 'string') throw new Error('Upload endpoint returned no URL')
  return json.url
}

/** Best-effort direct upload, for networks where CORS is not in the way. */
async function uploadDirect(file: File): Promise<string> {
  const form = new FormData()
  form.append('reqtype', 'fileupload')
  form.append('fileToUpload', file)
  const response = await request(
    'https://catbox.moe/user/api.php',
    { method: 'POST', body: form },
    DIRECT_TIMEOUT_MS,
  )
  if (!response.ok) {
    throw new Error(`Image host responded with ${response.status}`)
  }
  return (await response.text()).trim()
}

async function request(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

/** Re-encodes oversized PNG/JPEG to WebP; anything else passes through. */
export async function compressImage(file: File): Promise<File> {
  if (file.size <= COMPRESS_ABOVE || !REENCODABLE.test(file.type)) return file
  const reencoded = await reencode(file, 0.85, 1600)
  return reencoded && reencoded.size < file.size ? reencoded : file
}

/** Extra passes used only when the image has to live inside the document. */
async function shrinkForInline(file: File): Promise<File> {
  let out = file
  for (const [quality, maxEdge] of [
    [0.7, 1280],
    [0.55, 1024],
  ] as const) {
    if (out.size <= INLINE_TARGET || !REENCODABLE_INLINE.test(out.type)) break
    const smaller = await reencode(out, quality, maxEdge)
    if (!smaller || smaller.size >= out.size) break
    out = smaller
  }
  return out
}

async function reencode(
  file: File,
  quality: number,
  maxEdge: number,
): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    )
    if (!blob) return null

    const name = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.webp`
    return new File([blob], name, { type: 'image/webp' })
  } catch {
    return null
  }
}

/** File name without the extension, stripped of markdown-breaking characters. */
function altFor(file: File): string {
  const alt = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[[\]()<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return alt || 'pasted image'
}

/** Human-readable host for the "hosted on …" toast. */
function hostOf(url?: string): string {
  try {
    return url ? new URL(url).host : 'the image host'
  } catch {
    return 'the image host'
  }
}
