import { Buffer } from 'buffer'
import { explorerName, server, xahauNetwork } from '../../utils'

const escapeSvg = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const clampText = (value, maxLength) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? text.slice(0, maxLength - 1).trimEnd() + '…' : text
}

const allowedImage = (value) => {
  if (!value) return ''
  try {
    const imageUrl = new URL(String(value), server)
    const siteHost = new URL(server).hostname
    const allowedHosts = new Set([siteHost, `cdn.${siteHost.replace(/^(?:test\.|dev\.|staging\.)/, '')}`])
    return imageUrl.protocol === 'https:' && allowedHosts.has(imageUrl.hostname) ? imageUrl.toString() : ''
  } catch {
    return ''
  }
}

const tokenIcon = async (sharp, imageUrl, size) => {
  if (!imageUrl) return null
  try {
    const response = await fetch(imageUrl, { headers: { accept: 'image/*' } })
    if (!response.ok) return null
    const source = Buffer.from(await response.arrayBuffer())
    const image = await sharp(source).resize(size, size, { fit: 'cover' }).png().toBuffer()
    const mask = Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`)
    return sharp(image).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  } catch {
    return null
  }
}

export async function getServerSideProps({ query, res }) {
  const sharp = (await import('sharp')).default
  const square = query.shape === 'square'
  const width = square ? 630 : 1200
  const currency = escapeSvg(clampText(query.currency || 'Token', square ? 22 : 34))
  const titleSize = square ? (currency.length > 14 ? 54 : 68) : currency.length > 22 ? 66 : 82
  const holdersValue = Number(query.holders)
  const holders = Number.isFinite(holdersValue) && holdersValue >= 0
    ? `${new Intl.NumberFormat('en-US').format(Math.trunc(holdersValue))} holders`
    : 'Top holders and concentration'
  const iconSize = square ? 116 : 164
  const iconLeft = square ? 454 : 934
  const iconTop = square ? 76 : 88
  const icon = await tokenIcon(sharp, allowedImage(query.image), iconSize)
  const theme = xahauNetwork
    ? { background: '#061322', panel: '#0E233F', accent: '#ffcc53', muted: '#b7c6d8' }
    : { background: '#071416', panel: '#07363b', accent: '#00b8c8', muted: '#b7cacc' }
  const pattern = square
    ? `<path d="M0 424L158 320L315 424L472 320L630 424V630H0V424Z" fill="${theme.accent}" opacity="0.14"/>
       <circle cx="504" cy="116" r="150" fill="${theme.accent}" opacity="0.12"/>`
    : `<path d="M0 444L330 252L660 444L990 252L1200 374V630H0V444Z" fill="${theme.accent}" opacity="0.14"/>
       <circle cx="970" cy="120" r="230" fill="${theme.accent}" opacity="0.12"/>`
  const textX = square ? 54 : 82
  const labelY = square ? 150 : 170
  const currencyY = square ? 270 : 304
  const subtitleY = square ? 350 : 390
  const brandY = square ? 540 : 540

  const svg = `
    <svg width="${width}" height="630" viewBox="0 0 ${width} 630" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="630" fill="${theme.background}"/>
      <path d="M0 110L${square ? 160 : 250} 0H${width}V630H0V110Z" fill="${theme.panel}" opacity="0.76"/>
      ${pattern}
      <text x="${textX}" y="${labelY}" font-family="Arial, Helvetica, sans-serif" font-size="${square ? 24 : 30}" font-weight="700" fill="${theme.accent}" letter-spacing="2">TOKEN DISTRIBUTION</text>
      <text x="${textX}" y="${currencyY}" font-family="Arial, Helvetica, sans-serif" font-size="${titleSize}" font-weight="800" fill="#ffffff">${currency}</text>
      ${icon ? `<circle cx="${iconLeft + iconSize / 2}" cy="${iconTop + iconSize / 2}" r="${iconSize / 2 + 7}" fill="${theme.background}" stroke="${theme.accent}" stroke-width="5"/>` : ''}
      <text x="${textX}" y="${subtitleY}" font-family="Arial, Helvetica, sans-serif" font-size="${square ? 29 : 38}" font-weight="600" fill="${theme.muted}">${escapeSvg(holders)}</text>
      <text x="${textX}" y="${subtitleY + (square ? 42 : 50)}" font-family="Arial, Helvetica, sans-serif" font-size="${square ? 21 : 26}" font-weight="600" fill="${theme.muted}">Top holders and concentration</text>
      <text x="${textX}" y="${brandY}" font-family="Arial, Helvetica, sans-serif" font-size="${square ? 26 : 30}" font-weight="700" fill="#ffffff">${escapeSvg(explorerName)}</text>
      <rect x="${textX}" y="${brandY + 28}" width="${square ? 520 : 1030}" height="2" fill="${theme.accent}" opacity="0.48"/>
    </svg>`

  const png = await sharp(Buffer.from(svg))
    .composite(icon ? [{ input: icon, left: iconLeft, top: iconTop }] : [])
    .png()
    .toBuffer()
  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  res.end(png)

  return { props: {} }
}

export default function DistributionPreview() {
  return null
}
