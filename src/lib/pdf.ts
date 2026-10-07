import { WATERMARK_TEXT, WATERMARK_URL } from './site'

/**
 * Builds a print-ready, self-contained copy of the preview so that html2pdf
 * (which rasterises the DOM) has clean, watermark-free markup to work with.
 * The watermark is added afterwards as PDF page furniture.
 */
function prepareClone(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement

  clone.querySelectorAll<HTMLElement>('.mermaid').forEach((el) => {
    el.removeAttribute('data-error')
    el.style.background = 'transparent'
    el.style.border = 'none'
    el.style.margin = '16px 0'
    el.style.padding = '0'
    el.style.display = 'block'
    el.style.textAlign = 'center'
  })

  // Remove anchor permalink icons from headings.
  clone.querySelectorAll('.anchor').forEach((el) => el.remove())

  // Make sure links are readable in print.
  clone.querySelectorAll('a').forEach((a) => {
    a.style.color = '#0b63b0'
    a.style.textDecoration = 'none'
  })

  return clone
}

interface PdfPageSize {
  getWidth: () => number
  getHeight: () => number
}

interface PdfDoc {
  setFontSize: (n: number) => void
  setTextColor: (r: number, g: number, b: number) => void
  text: (text: string, x: number, y: number, opts?: object) => void
  link: (x: number, y: number, w: number, h: number, url: string) => void
  internal: { pageSize: PdfPageSize }
  getNumberOfPages: () => number
  setPage: (n: number) => void
  save: (name: string) => void
}

interface PdfOptions {
  title: string
  theme: 'dark' | 'light'
  /** Element that holds the rendered `.markdown-body` content. */
  source: HTMLElement
}

function toFilename(title: string): string {
  const slug = (title || 'document')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
  return `${slug || 'document'}.pdf`
}

/**
 * Generates and downloads a PDF of the current document. The heavy libraries
 * (html2canvas + jsPDF) are imported lazily so they never affect first load.
 */
export async function downloadPdf({
  title,
  theme,
  source,
}: PdfOptions): Promise<void> {
  const { default: html2pdf } = await import('html2pdf.js')

  const clone = prepareClone(source)
  const isDark = theme === 'dark'
  const bg = isDark ? '#0b0f17' : '#ffffff'
  const fg = isDark ? '#e6ecf7' : '#161e30'

  // Off-screen wrapper so the clone is laid out with a print-friendly width.
  // The wrapper carries the `dark` class as an *ancestor* because the themed
  // rules are scoped to `.dark .markdown-body …` (headings, code, tables…).
  const wrapper = document.createElement('div')
  Object.assign(wrapper.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '794px', // ~A4 width at 96dpi
    padding: '48px 56px',
    boxSizing: 'border-box',
    background: bg,
    color: fg,
  })
  if (isDark) wrapper.classList.add('dark')
  // Ensure the cloned content itself keeps the markdown-body styles.
  clone.classList.add('markdown-body')
  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  const filename = toFilename(title)

  try {
    const worker = html2pdf()
    // `pagebreak` is supported at runtime but missing from the bundled types.
    worker.set({
      margin: [16, 14, 22, 14],
      filename,
      image: { type: 'jpeg', quality: 0.96 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: bg,
        logging: false,
        windowWidth: 794,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    } as Parameters<typeof worker.set>[0] & {
      pagebreak: { mode: string[] }
    })

    const pdf = (await worker.from(wrapper).toPdf().get('pdf')) as PdfDoc

    const pageCount = pdf.getNumberOfPages()
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page)

      // Footer watermark + clickable link back to the author.
      pdf.setFontSize(8)
      pdf.setTextColor(140, 150, 170)
      pdf.text(WATERMARK_TEXT, 14, pageHeight - 8)
      pdf.link(14, pageHeight - 12, 70, 6, WATERMARK_URL)

      // Page number
      pdf.text(`${page} / ${pageCount}`, pageWidth - 14, pageHeight - 8, {
        align: 'right',
      })
    }

    pdf.save(filename)
  } finally {
    wrapper.remove()
  }
}
