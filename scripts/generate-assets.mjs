// One-off asset generator — run with: node scripts/generate-assets.mjs
//
// Produces TRANSPARENT favicons, PWA icons and a social preview image from
// public/icon.png. The logo is:
//   1. trimmed of its transparent padding,
//   2. scaled to fill most of each square canvas, and
//   3. given a soft drop shadow so it stays visible on light backgrounds
//      (the icon contains white cards that would otherwise blend into white).
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pngToIco from 'png-to-ico'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
const source = join(publicDir, 'icon.png')

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

/** Trimmed, tightly-cropped logo with a transparent background. */
async function trimmedLogo() {
  return sharp(source).trim({ threshold: 1 }).png().toBuffer()
}

function blank(size) {
  return sharp({
    create: { width: size, height: size, channels: 4, background: TRANSPARENT },
  })
}

/**
 * Fits the logo into a square canvas with a transparent background.
 * `fill` is how much of the canvas the logo occupies (0..1).
 * `shadow` adds a soft, subtle drop shadow for definition.
 */
async function squareIcon(logo, size, fill, shadow = true) {
  const inner = Math.max(1, Math.round(size * fill))
  const scaled = await sharp(logo)
    .resize(inner, inner, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer()

  if (!shadow || size < 24) {
    return blank(size)
      .composite([{ input: scaled, gravity: 'center' }])
      .png()
      .toBuffer()
  }

  // Build a black silhouette of the logo, then blur it into a shadow.
  const silhouette = await sharp(scaled)
    .ensureAlpha()
    .recomb([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ])
    .linear([1, 1, 1, 0.45], [0, 0, 0, 0])
    .png()
    .toBuffer()

  const blur = Math.max(1.2, size * 0.028)
  const offset = Math.max(1, Math.round(size * 0.02))

  const shadowLayer = await sharp(
    await blank(size)
      .composite([{ input: silhouette, gravity: 'center' }])
      .png()
      .toBuffer(),
  )
    .blur(blur)
    .png()
    .toBuffer()

  return blank(size)
    .composite([
      { input: shadowLayer, left: 0, top: offset },
      { input: scaled, gravity: 'center' },
    ])
    .png()
    .toBuffer()
}

/** Renders a 1200x630 Open Graph / Twitter card (solid background is fine here). */
async function socialCard(logo) {
  const width = 1200
  const height = 630
  const mark = await sharp(logo)
    .resize(500, 500, { fit: 'contain', background: TRANSPARENT })
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
    .composite([{ input: mark, left: 20, top: 65 }])
    // Palette PNG: the smooth gradient costs ~430 kB lossless but ~90 kB as
    // 256 colours with dithering. Some preview crawlers get unreliable above
    // ~300 kB, and nothing on this card needs more than 256 distinct colours.
    .png({ palette: true, quality: 90, colours: 256, dither: 1 })
    .toBuffer()
}

async function main() {
  await mkdir(publicDir, { recursive: true })

  const logo = await trimmedLogo()
  const meta = await sharp(logo).metadata()
  console.log(`Trimmed logo: ${meta.width}x${meta.height} (transparent)\n`)

  // `fill` = how much of the canvas the logo occupies. Small favicons go nearly
  // edge-to-edge; larger app icons keep a little breathing room.
  const sizes = [
    { name: 'favicon-16x16.png', size: 16, fill: 1 },
    { name: 'favicon-32x32.png', size: 32, fill: 1 },
    { name: 'favicon-48x48.png', size: 48, fill: 0.98 },
    { name: 'apple-touch-icon.png', size: 180, fill: 0.9 },
    { name: 'logo.png', size: 96, fill: 0.9 },
    { name: 'android-chrome-192x192.png', size: 192, fill: 0.88 },
    { name: 'android-chrome-512x512.png', size: 512, fill: 0.84 },
    { name: 'icon-512.png', size: 512, fill: 0.8 },
  ]

  for (const { name, size, fill } of sizes) {
    const buf = await squareIcon(logo, size, fill)
    await writeFile(join(publicDir, name), buf)
    console.log(`✓ ${name} (${size}px, transparent, logo ${Math.round(fill * 100)}%)`)
  }

  const ico = await pngToIco([
    await squareIcon(logo, 16, 1),
    await squareIcon(logo, 32, 1),
    await squareIcon(logo, 48, 0.98),
    await squareIcon(logo, 64, 0.96),
  ])
  await writeFile(join(publicDir, 'favicon.ico'), ico)
  console.log('✓ favicon.ico (16/32/48/64, transparent)')

  const og = await socialCard(logo)
  await writeFile(join(publicDir, 'og-image.png'), og)
  console.log(`✓ og-image.png (1200x630, ${Math.round(og.length / 1024)} kB)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
