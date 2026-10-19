import { WATERMARK_TEXT, WATERMARK_URL } from '../lib/site'

/**
 * Attribution printed on every page when the document is printed or exported
 * to PDF. The on-screen badge lives in the status bar footer instead, so it
 * never floats over the content.
 */
export function Watermark() {
  return (
    <div className="print-watermark hidden">
      <a href={WATERMARK_URL}>{WATERMARK_TEXT}</a>
    </div>
  )
}
