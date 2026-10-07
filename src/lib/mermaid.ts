type MermaidApi = typeof import('mermaid').default

let mermaidPromise: Promise<MermaidApi> | null = null
let initialized = false
let currentTheme: 'dark' | 'light' | null = null
let counter = 0

function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => mod.default)
  }
  return mermaidPromise
}

async function initMermaid(mermaid: MermaidApi, theme: 'dark' | 'light') {
  if (initialized && currentTheme === theme) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: theme === 'dark' ? 'dark' : 'default',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    themeVariables: {
      primaryColor: theme === 'dark' ? '#1a2440' : '#eaf4ff',
      primaryTextColor: theme === 'dark' ? '#e6ecf7' : '#161e30',
      primaryBorderColor: theme === 'dark' ? '#4fb8ff' : '#1f9dff',
      lineColor: theme === 'dark' ? '#8b9cc0' : '#64749b',
      fontSize: '15px',
    },
  })
  initialized = true
  currentTheme = theme
}

/**
 * Renders every `.mermaid[data-source]` node inside `root` and swaps the
 * placeholder for the produced SVG. Mermaid is imported lazily so the initial
 * bundle stays small. Safe to call repeatedly.
 */
export async function renderMermaid(
  root: HTMLElement,
  theme: 'dark' | 'light',
): Promise<void> {
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>('.mermaid[data-source]'),
  )
  if (nodes.length === 0) return

  const mermaid = await loadMermaid()
  await initMermaid(mermaid, theme)

  for (const node of nodes) {
    const source = node.dataset.source ?? ''
    if (!source.trim()) continue

    try {
      const id = `mermaid-${Date.now()}-${counter++}`
      const { svg } = await mermaid.render(id, source)
      node.innerHTML = svg
      node.removeAttribute('data-source')
    } catch (error) {
      node.dataset.error = 'true'
      node.textContent = `Mermaid error: ${
        error instanceof Error ? error.message : String(error)
      }`
      node.removeAttribute('data-source')
    }
  }

  // Avoid a stray error SVG that mermaid occasionally injects into <body>.
  document
    .querySelectorAll('body > svg[id^="mermaid-"], body > #dmermaid-')
    .forEach((el) => el.remove())
}
