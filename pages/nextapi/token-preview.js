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

const priceText = (value, fiatCurrency) => {
  const price = Number(value)
  if (!Number.isFinite(price) || price <= 0) return ''
  const currency = /^[A-Za-z]{3}$/.test(fiatCurrency || '') ? fiatCurrency.toUpperCase() : 'USD'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumSignificantDigits: price < 1 ? 7 : 6
    }).format(price)
  } catch {
    return `${price} ${currency}`
  }
}

export async function getServerSideProps({ query, res }) {
  const sharp = (await import('sharp')).default
  const square = query.shape === 'square'
  const width = square ? 630 : 1200
  const name = clampText(query.name || query.ticker || 'Token', square ? 22 : 36)
  const ticker = clampText(query.ticker, 16)
  const price = priceText(query.price, query.fiat)
  const iconSize = square ? 116 : 164
  const iconLeft = square ? 454 : 934
  const iconTop = square ? 76 : 88
  const image = await tokenIcon(sharp, allowedImage(query.image), iconSize)
  const hasImage = !!image
  const textX = square ? 58 : 82
  const titleY = square ? 250 : 230
  const titleSize = square ? (name.length > 15 ? 48 : 60) : name.length > 25 ? 58 : 72
  const theme = xahauNetwork
    ? { background: '#061322', panel: '#0E233F', accent: '#ffcc53', muted: '#b7c6d8' }
    : { background: '#071416', panel: '#07363b', accent: '#00b8c8', muted: '#b7cacc' }
  const tickerText = ticker && ticker.toLowerCase() !== name.toLowerCase() ? ticker : ''

  const svg = `
    <svg width="${width}" height="630" viewBox="0 0 ${width} 630" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="630" fill="${theme.background}"/>
      <path d="M0 112L${square ? 165 : 248} 0H${width}V630H0V112Z" fill="${theme.panel}" opacity="0.78"/>
      <path d="M0 448L${square ? 158 : 330} 340L${square ? 315 : 660} 448L${square ? 472 : 990} 340L${width} 438V630H0V448Z" fill="${theme.accent}" opacity="0.14"/>
      <circle cx="${square ? 505 : 980}" cy="124" r="${square ? 142 : 220}" fill="${theme.accent}" opacity="0.12"/>
      ${hasImage ? `<circle cx="${iconLeft + iconSize / 2}" cy="${iconTop + iconSize / 2}" r="${iconSize / 2 + 7}" fill="${theme.background}" stroke="${theme.accent}" stroke-width="5"/>` : ''}
      <text x="${textX}" y="${square ? 52 : 114}" font-family="Arial, Helvetica, sans-serif" font-size="${square ? 22 : 28}" font-weight="700" fill="${theme.accent}" letter-spacing="2">TOKEN</text>
      <text x="${textX}" y="${titleY}" font-family="Arial, Helvetica, sans-serif" font-size="${titleSize}" font-weight="800" fill="#fff">${escapeSvg(name)}</text>
      ${tickerText ? `<text x="${textX}" y="${titleY + 48}" font-family="Arial, Helvetica, sans-serif" font-size="${square ? 27 : 32}" font-weight="700" fill="${theme.muted}">${escapeSvg(tickerText)}</text>` : ''}
      <text x="${textX}" y="${square ? 380 : 368}" font-family="Arial, Helvetica, sans-serif" font-size="${square ? 25 : 28}" font-weight="600" fill="${theme.muted}">CURRENT PRICE</text>
      <text x="${textX}" y="${square ? 437 : 428}" font-family="Arial, Helvetica, sans-serif" font-size="${square ? 40 : 48}" font-weight="800" fill="#fff">${escapeSvg(price || 'Price unavailable')}</text>
      <text x="${textX}" y="548" font-family="Arial, Helvetica, sans-serif" font-size="${square ? 25 : 30}" font-weight="700" fill="#fff">${escapeSvg(explorerName)}</text>
      <rect x="${textX}" y="576" width="${square ? 514 : 1030}" height="2" fill="${theme.accent}" opacity="0.5"/>
    </svg>`

  const composites = image ? [{ input: image, left: iconLeft, top: iconTop }] : []
  const png = await sharp(Buffer.from(svg)).composite(composites).png().toBuffer()
  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  res.end(png)
  return { props: {} }
}

export default function TokenPreview() {
  return null
}
