import { Buffer } from 'buffer'
import { ledgerName, siteName, xahauNetwork } from '../../utils'

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
  if (type === 'Payment') return { accent: '#00bcd4', dark: '#003d47', mark: 'PAY' }
  if (type === 'TrustSet') return { accent: '#8e44ad', dark: '#321243', mark: 'TL' }
  if (type === 'OfferCreate' || type === 'OfferCancel') return { accent: '#f1c40f', dark: '#4b3d00', mark: 'DEX' }
  if (type?.includes('AMM')) return { accent: '#2e86de', dark: '#082f57', mark: 'AMM' }
  if (type?.includes('NFToken')) return { accent: '#e67e22', dark: '#4a2107', mark: 'NFT' }
  if (type?.includes('Check')) return { accent: '#27ae60', dark: '#06361c', mark: 'CHK' }
  if (type?.includes('Escrow')) return { accent: '#16a085', dark: '#053a32', mark: 'ESC' }
  if (type?.includes('DID')) return { accent: '#9b59b6', dark: '#351946', mark: 'DID' }
  if (type?.includes('URIToken')) return { accent: '#2980ef', dark: '#082f57', mark: 'URI' }
  if (type?.startsWith('MPToken')) return { accent: '#ff6b6b', dark: '#4b1111', mark: 'MPT' }
  return { accent: '#00a6b4', dark: '#07363b', mark: 'TX' }
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
  const amountText = escapeSvg(clampText(query.amount, square ? 42 : 72))
  const label = escapeSvg(getTransactionTypeLabel(type))
  const style = txStyle(type)
  const statusText = status === 'failed' ? 'Failed transaction' : status === 'pending' ? 'Pending transaction' : 'Validated transaction'
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
  const theme = xahauNetwork
    ? { accent: '#ffcc53', dark: '#0E233F', background: '#061322', iconBackground: '#0E233F' }
    : { accent: style.accent, dark: style.dark, background: '#071416', iconBackground: '#0d2226' }
  const previewBrand = escapeSvg(siteName)
  const previewLabel = escapeSvg(`${ledgerName} transaction preview`)
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

      <g transform="translate(65 62)">
        <rect x="0" y="0" width="154" height="154" rx="36" fill="${theme.iconBackground}" stroke="${theme.accent}" stroke-width="5"/>
        <circle cx="77" cy="77" r="45" fill="${theme.accent}" opacity="0.22"/>
        <text x="77" y="90" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" fill="${theme.accent}">${escapeSvg(style.mark)}</text>
      </g>

      <text x="65" y="280" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="6" fill="${theme.accent}">${previewBrand}</text>
      <text x="65" y="360" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" fill="#ffffff">${label}</text>
      ${amountText ? `<text x="65" y="414" font-family="Arial, Helvetica, sans-serif" font-size="31" font-weight="700" fill="#ffffff">${amountText}</text>` : ''}
      <text x="65" y="${amountText ? '468' : '414'}" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="${statusColor}">${escapeSvg(statusText)}</text>
      <text x="65" y="535" font-family="Arial, Helvetica, sans-serif" font-size="25" fill="#b7cacc">${previewLabel}</text>
      <rect x="65" y="568" width="500" height="2" fill="${theme.accent}" opacity="0.42"/>
    </svg>
  `
    : `
    <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
      ${wideBackground}

      <g transform="translate(86 78)">
        <rect x="0" y="0" width="210" height="210" rx="46" fill="${theme.iconBackground}" stroke="${theme.accent}" stroke-width="6"/>
        <circle cx="105" cy="105" r="62" fill="${theme.accent}" opacity="0.22"/>
        <text x="105" y="121" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="800" fill="${theme.accent}">${escapeSvg(style.mark)}</text>
      </g>

      <text x="338" y="140" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="7" fill="${theme.accent}">${previewBrand}</text>
      <text x="338" y="236" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="800" fill="#ffffff">${label}</text>
      ${amountText ? `<text x="338" y="302" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700" fill="#ffffff">${amountText}</text>` : ''}
      <text x="338" y="${amountText ? '356' : '302'}" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="${statusColor}">${escapeSvg(statusText)}</text>
      <text x="86" y="520" font-family="Arial, Helvetica, sans-serif" font-size="32" fill="#b7cacc">${previewLabel}</text>
      <rect x="86" y="556" width="1028" height="2" fill="${theme.accent}" opacity="0.42"/>
    </svg>
  `

  let png = await sharp(Buffer.from(svg)).png().toBuffer()
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
