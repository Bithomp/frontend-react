const escapeSvg = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

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

export async function getServerSideProps({ query, res }) {
  const sharp = (await import('sharp')).default
  const { getTransactionTypeLabel } = await import('../../utils/transaction')
  const type = String(query.type || 'Transaction').slice(0, 40)
  const status = String(query.status || 'success')
  const square = query.shape === 'square'
  const label = escapeSvg(getTransactionTypeLabel(type))
  const style = txStyle(type)
  const statusText = status === 'failed' ? 'Failed transaction' : status === 'pending' ? 'Pending transaction' : 'Validated transaction'
  const statusColor = status === 'failed' ? '#ff9f43' : status === 'pending' ? '#b0bec5' : '#66e3bb'

  const svg = square
    ? `
    <svg width="630" height="630" viewBox="0 0 630 630" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="630" height="630" fill="#071416"/>
      <path d="M0 116L158 0H630V630H0V116Z" fill="${style.dark}" opacity="0.56"/>
      <path d="M0 438L158 334L315 438L472 334L630 438V630H0V438Z" fill="${style.accent}" opacity="0.14"/>
      <circle cx="504" cy="118" r="136" fill="${style.accent}" opacity="0.15"/>
      <circle cx="504" cy="118" r="82" fill="${style.accent}" opacity="0.12"/>

      <g transform="translate(65 62)">
        <rect x="0" y="0" width="154" height="154" rx="36" fill="#0d2226" stroke="${style.accent}" stroke-width="5"/>
        <circle cx="77" cy="77" r="45" fill="${style.accent}" opacity="0.22"/>
        <text x="77" y="90" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" fill="${style.accent}">${escapeSvg(style.mark)}</text>
      </g>

      <text x="65" y="280" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="6" fill="${style.accent}">BITHOMP</text>
      <text x="65" y="360" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" fill="#ffffff">${label}</text>
      <text x="65" y="414" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="${statusColor}">${escapeSvg(statusText)}</text>
      <text x="65" y="535" font-family="Arial, Helvetica, sans-serif" font-size="25" fill="#b7cacc">XRP Ledger transaction preview</text>
      <rect x="65" y="568" width="500" height="2" fill="${style.accent}" opacity="0.42"/>
    </svg>
  `
    : `
    <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#071416"/>
      <path d="M0 126L240 0H1200V630H0V126Z" fill="${style.dark}" opacity="0.52"/>
      <path d="M0 444L330 252L660 444L990 252L1200 374V630H0V444Z" fill="${style.accent}" opacity="0.12"/>
      <circle cx="960" cy="126" r="210" fill="${style.accent}" opacity="0.14"/>
      <circle cx="960" cy="126" r="130" fill="${style.accent}" opacity="0.13"/>

      <g transform="translate(86 78)">
        <rect x="0" y="0" width="210" height="210" rx="46" fill="#0d2226" stroke="${style.accent}" stroke-width="6"/>
        <circle cx="105" cy="105" r="62" fill="${style.accent}" opacity="0.22"/>
        <text x="105" y="121" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="800" fill="${style.accent}">${escapeSvg(style.mark)}</text>
      </g>

      <text x="338" y="140" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="7" fill="${style.accent}">BITHOMP</text>
      <text x="338" y="236" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="800" fill="#ffffff">${label}</text>
      <text x="338" y="302" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="${statusColor}">${escapeSvg(statusText)}</text>
      <text x="86" y="520" font-family="Arial, Helvetica, sans-serif" font-size="32" fill="#b7cacc">XRP Ledger transaction preview</text>
      <rect x="86" y="556" width="1028" height="2" fill="${style.accent}" opacity="0.42"/>
    </svg>
  `

  const png = await sharp(Buffer.from(svg)).png().toBuffer()

  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  res.end(png)

  return { props: {} }
}

export default function TxPreview() {
  return null
}
