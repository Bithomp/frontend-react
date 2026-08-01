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

const dappIcon = async (sharp, imageUrl, size) => {
  if (!imageUrl) return null
  try {
    const response = await fetch(imageUrl, { headers: { accept: 'image/*' } })
    if (!response.ok) return null
    const source = Buffer.from(await response.arrayBuffer())
    return sharp(source).resize(size, size, { fit: 'contain' }).png().toBuffer()
  } catch {
    return null
  }
}

export async function getServerSideProps({ query, res }) {
  const sharp = (await import('sharp')).default
  const name = clampText(query.name || 'dApp', 34)
  const sourceTag = /^\d+$/.test(String(query.sourceTag || '')) ? String(query.sourceTag) : ''
  const iconSize = 178
  const iconLeft = 916
  const iconTop = 112
  const icon = await dappIcon(sharp, allowedImage(query.image), iconSize)
  const titleSize = name.length > 24 ? 60 : name.length > 14 ? 70 : 82
  const fallbackLetter = escapeSvg(name.charAt(0).toUpperCase() || 'D')
  const theme = xahauNetwork
    ? { background: '#061322', panel: '#0E233F', accent: '#ffcc53', muted: '#b7c6d8' }
    : { background: '#071416', panel: '#07363b', accent: '#00b8c8', muted: '#b7cacc' }

  const svg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="${theme.background}"/>
      <path d="M0 110L250 0H1200V630H0V110Z" fill="${theme.panel}" opacity="0.78"/>
      <path d="M0 448L330 340L660 448L990 340L1200 410V630H0V448Z" fill="${theme.accent}" opacity="0.14"/>
      <circle cx="1010" cy="138" r="235" fill="${theme.accent}" opacity="0.11"/>
      <rect x="${iconLeft - 13}" y="${iconTop - 13}" width="${iconSize + 26}" height="${iconSize + 26}" rx="42" fill="${theme.background}" stroke="${theme.accent}" stroke-width="5"/>
      ${icon ? '' : `<text x="${iconLeft + iconSize / 2}" y="${iconTop + 122}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="112" font-weight="800" fill="${theme.accent}">${fallbackLetter}</text>`}
      <text x="82" y="126" font-family="Arial, Helvetica, sans-serif" font-size="29" font-weight="700" fill="${theme.accent}" letter-spacing="2">DAPP ANALYTICS</text>
      <text x="82" y="270" font-family="Arial, Helvetica, sans-serif" font-size="${titleSize}" font-weight="800" fill="#fff">${escapeSvg(name)}</text>
      <text x="82" y="354" font-family="Arial, Helvetica, sans-serif" font-size="29" font-weight="600" fill="${theme.muted}">SOURCE TAG</text>
      <text x="82" y="408" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="800" fill="#fff">${escapeSvg(sourceTag || 'Unknown')}</text>
      <text x="82" y="548" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#fff">${escapeSvg(explorerName)}</text>
      <rect x="82" y="576" width="1030" height="2" fill="${theme.accent}" opacity="0.5"/>
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

export default function DappPreview() {
  return null
}
