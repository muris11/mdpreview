export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export interface DocStats {
  words: number
  characters: number
  charactersNoSpaces: number
  lines: number
  readingMinutes: number
}

const WORDS_PER_MINUTE = 200

export function computeStats(text: string): DocStats {
  const trimmed = text.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  return {
    words,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    lines: text ? text.split('\n').length : 0,
    readingMinutes: Math.max(words ? 1 : 0, Math.round(words / WORDS_PER_MINUTE)),
  }
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking synchronously cancels the download in some browsers, so let the
  // navigation start first.
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function slugifyFilename(name: string, fallback = 'document'): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || fallback
}
