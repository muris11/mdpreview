// One-off asset generator — run with: node scripts/generate-assets.mjs
// Produces favicons, PWA icons and a social preview image from public/icon.png.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pngToIco from 'png-to-ico'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
const source = join(publicDir, 'icon.png')

const BRAND = { from: '#1f9dff', to: '#0b7fe0' }

/** Fits the logo into a square canvas with a solid background. */
async function squareIcon(size, { padding = 0.1, background = '#ffffff' } = {}) {
  const inner = Math.round(size * (1 - padding * 2))
  const logo = await sharp(source)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer()
}

/** Renders a 1200x630 Open Graph / Twitter card. */
async function socialCard() {
  const width = 1200
  const height = 630
  const logo = await sharp(source)
    .resize(420, 420, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const backdrop = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0b0f17"/>
        <stop offset="0.55" stop-color="#111c33"/>
        <stop offset="1" stop-color="#0a63b0"/>
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#8fd3ff"/>
        <stop offset="1" stop-color="#1f9dff"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <circle cx="1120" cy="80" r="260" fill="#1f9dff" opacity="0.16"/>
    <circle cx="60" cy="600" r="200" fill="#8fd3ff" opacity="0.10"/>
    <text x="520" y="248" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif"
      font-size="66" font-weight="700" fill="#ffffff">MDPreview Center</text>
    <text x="520" y="312" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif"
      font-size="30" font-weight="400" fill="#b9c6de">Markdown editor with live preview,</text>
    <text x="520" y="354" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif"
      font-size="30" font-weight="400" fill="#b9c6de">diagrams, math &amp; shareable links.</text>
    <rect x="520" y="410" width="300" height="6" rx="3" fill="url(#accent)"/>
    <text x="520" y="486" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif"
      font-size="27" font-weight="600" fill="#8fd3ff">built by rifqysaputra.dev</text>
  </svg>`)

  return sharp(backdrop)
    .composite([{ input: logo, left: 60, top: 105 }])
    .png()
    .toBuffer()
}

async function main() {
  await mkdir(publicDir, { recursive: true })

  const sizes = [
    { name: 'favicon-16x16.png', size: 16, padding: 0.06 },
    { name: 'favicon-32x32.png', size: 32, padding: 0.06 },
    { name: 'favicon-48x48.png', size: 48, padding: 0.06 },
    { name: 'apple-touch-icon.png', size: 180, padding: 0.1 },
    { name: 'android-chrome-192x192.png', size: 192, padding: 0.1 },
    { name: 'android-chrome-512x512.png', size: 512, padding: 0.1 },
    { name: 'icon-512.png', size: 512, padding: 0.1 },
  ]

  for (const { name, size, padding } of sizes) {
    const buf = await squareIcon(size, { padding })
    await writeFile(join(publicDir, name), buf)
    console.log(`✓ ${name} (${size}x${size})`)
  }

  const ico = await pngToIco([
    await squareIcon(16, { padding: 0.06 }),
    await squareIcon(32, { padding: 0.06 }),
    await squareIcon(48, { padding: 0.06 }),
  ])
  await writeFile(join(publicDir, 'favicon.ico'), ico)
  console.log('✓ favicon.ico (16/32/48)')

  await writeFile(join(publicDir, 'og-image.png'), await socialCard())
  console.log('✓ og-image.png (1200x630)')

  console.log(`\nBrand gradient: ${BRAND.from} → ${BRAND.to}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
