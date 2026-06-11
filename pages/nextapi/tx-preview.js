import { Buffer } from 'buffer'
import { ledgerName, xahauNetwork } from '../../utils'

const escapeSvg = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const clampText = (value, maxLength) => {
  const text = String(value || '').trim()
  if (!text || text.length <= maxLength) return text

  return text.slice(0, Math.max(0, maxLength - 1)).trimEnd() + '…'
}

const txStyle = (type) => {
  if (type === 'Payment') return { accent: '#00bcd4', dark: '#003d47' }
  if (type === 'TrustSet') return { accent: '#8e44ad', dark: '#321243' }
  if (type === 'OfferCreate' || type === 'OfferCancel') return { accent: '#f1c40f', dark: '#4b3d00' }
  if (type?.includes('AMM')) return { accent: '#2e86de', dark: '#082f57' }
  if (type?.includes('NFToken')) return { accent: '#e67e22', dark: '#4a2107' }
  if (type?.includes('Check')) return { accent: '#27ae60', dark: '#06361c' }
  if (type?.includes('Escrow')) return { accent: '#16a085', dark: '#053a32' }
  if (type?.includes('DID')) return { accent: '#9b59b6', dark: '#351946' }
  if (type?.includes('URIToken')) return { accent: '#2980ef', dark: '#082f57' }
  if (type?.startsWith('MPToken')) return { accent: '#ff6b6b', dark: '#4b1111' }
  return { accent: '#00a6b4', dark: '#07363b' }
}

const allowedPreviewImage = (value) => {
  if (!value) return ''

  try {
    const url = new URL(String(value))
    if (url.protocol !== 'https:') return ''
    if (!['cdn.bithomp.com', 'cdn.xahauexplorer.com'].includes(url.hostname)) return ''
    return url.toString()
  } catch {
    return ''
  }
}

const roundedImage = async (sharp, imageUrl, width, height, radius) => {
  if (!imageUrl) return null

  try {
    const response = await fetch(imageUrl, { headers: { accept: 'image/*' } })
    if (!response.ok) return null

    const source = Buffer.from(await response.arrayBuffer())
    const image = await sharp(source)
      .resize(width, height, { fit: 'cover', withoutEnlargement: false })
      .png()
      .toBuffer()
    const mask = Buffer.from(`
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#fff"/>
      </svg>
    `)

    return sharp(image)
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer()
  } catch {
    return null
  }
}

export async function getServerSideProps({ query, res }) {
  const sharp = (await import('sharp')).default
  const { getTransactionTypeLabel } = await import('../../utils/transaction')
  const type = String(query.type || 'Transaction').slice(0, 40)
  const status = String(query.status || 'success')
  const square = query.shape === 'square'
  const imageUrl = allowedPreviewImage(query.image)
  const nftImageBox = square
    ? { left: 70, top: 67, width: 144, height: 144, radius: 32 }
    : { left: 92, top: 84, width: 198, height: 198, radius: 40 }
  const nftImage = await roundedImage(
    sharp,
    imageUrl,
    nftImageBox.width,
    nftImageBox.height,
    nftImageBox.radius
  )
  const hasPreviewImage = !!nftImage
  const squareTextX = hasPreviewImage ? 260 : 65
  const wideTextX = hasPreviewImage ? 338 : 86
  const rawTitle = clampText(query.title || getTransactionTypeLabel(type), square ? 30 : 42)
  const rawAmount = clampText(query.amount, square ? 38 : 66)
  const rawSubtitle = clampText(query.subtitle, square ? 42 : 70)
  const rawDetail = clampText(query.detail || `${ledgerName} transaction`, square ? 48 : 92)
  const titleText = escapeSvg(rawTitle)
  const amountText = escapeSvg(rawAmount)
  const subtitleText = escapeSvg(rawSubtitle)
  const detailText = escapeSvg(rawDetail)
  const style = txStyle(type)
  const statusText = status === 'failed' ? 'Failed' : status === 'pending' ? 'Pending' : 'Validated'
  const statusColor = xahauNetwork
    ? status === 'failed'
      ? '#ff9f43'
      : status === 'pending'
        ? '#b0bec5'
        : '#ffcc53'
    : status === 'failed'
      ? '#ff9f43'
      : status === 'pending'
        ? '#b0bec5'
        : '#66e3bb'
  const squareTitleSize = rawTitle.length > 24 ? 46 : 56
  const squareAmountSize = rawAmount.length > 28 ? 28 : 34
  const squareSubtitleSize = rawSubtitle.length > 34 ? 26 : 30
  const wideTitleSize = rawTitle.length > 32 ? 46 : rawTitle.length > 24 ? 54 : 64
  const wideAmountSize = rawAmount.length > 48 ? 30 : 38
  const wideSubtitleSize = rawSubtitle.length > 54 ? 28 : 34
  const theme = xahauNetwork
    ? { accent: '#ffcc53', dark: '#0E233F', background: '#061322', iconBackground: '#0E233F' }
    : { accent: style.accent, dark: style.dark, background: '#071416', iconBackground: '#0d2226' }
  const squareBackground = xahauNetwork
    ? `
      <rect width="630" height="630" fill="${theme.background}"/>
      <path d="M0 0H630V630H0V0Z" fill="${theme.dark}" opacity="0.52"/>
      <path d="M0 126L182 0H630V172L432 304L630 438V630H0V0Z" fill="#0b1b31" opacity="0.9"/>
      <path d="M0 434L156 328L316 438L472 334L630 438V630H0V434Z" fill="#0b2138" opacity="0.92"/>
      <path d="M0 434L156 328L316 438L472 334L630 438" stroke="${theme.accent}" stroke-width="3" opacity="0.36"/>
      <path d="M376 92H568" stroke="${theme.accent}" stroke-width="3" opacity="0.42"/>
      <path d="M438 132H592" stroke="${theme.accent}" stroke-width="2" opacity="0.24"/>
      <circle cx="546" cy="118" r="74" fill="${theme.accent}" opacity="0.08"/>
    `
    : `
      <rect width="630" height="630" fill="${theme.background}"/>
      <path d="M0 116L158 0H630V630H0V116Z" fill="${theme.dark}" opacity="0.78"/>
      <path d="M0 438L158 334L315 438L472 334L630 438V630H0V438Z" fill="${theme.accent}" opacity="0.16"/>
      <circle cx="504" cy="118" r="136" fill="${theme.accent}" opacity="0.16"/>
      <circle cx="504" cy="118" r="82" fill="${theme.accent}" opacity="0.13"/>
    `
  const wideBackground = xahauNetwork
    ? `
      <rect width="1200" height="630" fill="${theme.background}"/>
      <path d="M0 0H1200V630H0V0Z" fill="${theme.dark}" opacity="0.5"/>
      <path d="M0 126L252 0H1200V220L930 394L1200 566V630H0V126Z" fill="#0b1b31" opacity="0.92"/>
      <path d="M0 444L330 252L660 444L990 252L1200 374V630H0V444Z" fill="#0b2138" opacity="0.9"/>
      <path d="M0 444L330 252L660 444L990 252L1200 374" stroke="${theme.accent}" stroke-width="4" opacity="0.32"/>
      <path d="M736 100H1088" stroke="${theme.accent}" stroke-width="4" opacity="0.4"/>
      <path d="M820 154H1132" stroke="${theme.accent}" stroke-width="3" opacity="0.23"/>
      <circle cx="1014" cy="126" r="116" fill="${theme.accent}" opacity="0.07"/>
    `
    : `
      <rect width="1200" height="630" fill="${theme.background}"/>
      <path d="M0 126L240 0H1200V630H0V126Z" fill="${theme.dark}" opacity="0.78"/>
      <path d="M0 444L330 252L660 444L990 252L1200 374V630H0V444Z" fill="${theme.accent}" opacity="0.14"/>
      <circle cx="960" cy="126" r="210" fill="${theme.accent}" opacity="0.15"/>
      <circle cx="960" cy="126" r="130" fill="${theme.accent}" opacity="0.13"/>
    `

  const svg = square
    ? `
    <svg width="630" height="630" viewBox="0 0 630 630" fill="none" xmlns="http://www.w3.org/2000/svg">
      ${squareBackground}

      ${
        hasPreviewImage
          ? `<g transform="translate(65 62)">
        <rect x="0" y="0" width="154" height="154" rx="36" fill="${theme.iconBackground}" stroke="${theme.accent}" stroke-width="5"/>
      </g>`
          : ''
      }

      <text x="${squareTextX}" y="270" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="${statusColor}">${escapeSvg(statusText)}</text>
      <text x="${squareTextX}" y="344" font-family="Arial, Helvetica, sans-serif" font-size="${squareTitleSize}" font-weight="800" fill="#ffffff">${titleText}</text>
      ${amountText ? `<text x="${squareTextX}" y="400" font-family="Arial, Helvetica, sans-serif" font-size="${squareAmountSize}" font-weight="700" fill="#ffffff">${amountText}</text>` : ''}
      ${subtitleText ? `<text x="${squareTextX}" y="${amountText ? '456' : '404'}" font-family="Arial, Helvetica, sans-serif" font-size="${squareSubtitleSize}" font-weight="700" fill="#d7e6e7">${subtitleText}</text>` : ''}
      <text x="65" y="535" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#b7cacc">${detailText}</text>
      <rect x="65" y="568" width="500" height="2" fill="${theme.accent}" opacity="0.42"/>
    </svg>
  `
    : `
    <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
      ${wideBackground}

      ${
        hasPreviewImage
          ? `<g transform="translate(86 78)">
        <rect x="0" y="0" width="210" height="210" rx="46" fill="${theme.iconBackground}" stroke="${theme.accent}" stroke-width="6"/>
      </g>`
          : ''
      }

      <text x="${wideTextX}" y="142" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="${statusColor}">${escapeSvg(statusText)}</text>
      <text x="${wideTextX}" y="232" font-family="Arial, Helvetica, sans-serif" font-size="${wideTitleSize}" font-weight="800" fill="#ffffff">${titleText}</text>
      ${amountText ? `<text x="${wideTextX}" y="304" font-family="Arial, Helvetica, sans-serif" font-size="${wideAmountSize}" font-weight="700" fill="#ffffff">${amountText}</text>` : ''}
      ${subtitleText ? `<text x="${wideTextX}" y="${amountText ? '368' : '308'}" font-family="Arial, Helvetica, sans-serif" font-size="${wideSubtitleSize}" font-weight="700" fill="#d7e6e7">${subtitleText}</text>` : ''}
      <text x="86" y="520" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#b7cacc">${detailText}</text>
      <rect x="86" y="556" width="1028" height="2" fill="${theme.accent}" opacity="0.42"/>
    </svg>
  `

  let png = await sharp(Buffer.from(svg)).png().toBuffer()

  if (nftImage) {
    png = await sharp(png)
      .composite([{ input: nftImage, left: nftImageBox.left, top: nftImageBox.top }])
      .png()
      .toBuffer()
  }

  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  res.end(png)

  return { props: {} }
}

export default function TxPreview() {
  return null
}
