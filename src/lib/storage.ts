export interface DocState {
  content: string
  title: string
}

export type Theme = 'dark' | 'light'
export type ViewMode = 'editor' | 'split' | 'preview'

const KEYS = {
  doc: 'mdpreview:doc',
  theme: 'mdpreview:theme',
  view: 'mdpreview:view',
  sync: 'mdpreview:sync',
  wrap: 'mdpreview:wrap',
  split: 'mdpreview:split',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Returns false when the browser refused the write — normally a full quota.
 * Callers that persist the document care; the settings below do not.
 */
function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const storage = {
  loadDoc: (): DocState | null => read<DocState | null>(KEYS.doc, null),
  saveDoc: (doc: DocState): boolean => write(KEYS.doc, doc),

  loadTheme: (): Theme | null => read<Theme | null>(KEYS.theme, null),
  saveTheme: (theme: Theme) => {
    write(KEYS.theme, theme)
  },

  loadView: (): ViewMode => read<ViewMode>(KEYS.view, 'split'),
  saveView: (view: ViewMode) => {
    write(KEYS.view, view)
  },

  loadSync: (): boolean => read<boolean>(KEYS.sync, true),
  saveSync: (sync: boolean) => {
    write(KEYS.sync, sync)
  },

  loadWrap: (): boolean => read<boolean>(KEYS.wrap, true),
  saveWrap: (wrap: boolean) => {
    write(KEYS.wrap, wrap)
  },

  loadSplit: (): number => read<number>(KEYS.split, 50),
  saveSplit: (split: number) => {
    write(KEYS.split, split)
  },
}
