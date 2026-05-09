import Link from 'next/link'
import { AddressWithIconInline, shortHash } from '../../utils/format'
import { collectionNameText, NftImage, nftName } from '../../utils/nft'
import CopyButton from '../UI/CopyButton'

const textValue = (value) => {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'object') return value.name || value.family || value.title || ''
  return String(value)
}

const nftCollectionName = (nft) =>
  collectionNameText(nft?.collectionDetails) ||
  textValue(nft?.metadata?.collection?.name) ||
  textValue(nft?.metadata?.collection) ||
  textValue(nft?.metadata?.collection_name) ||
  textValue(nft?.metadata?.collectionName)

const nftDetails = (nft, title, id) =>
  [
    { label: 'Name', value: title },
    { label: 'Collection', value: nftCollectionName(nft) },
    { label: 'Taxon', value: nft?.nftokenTaxon ?? nft?.taxon },
    { label: 'Serial', value: nft?.sequence },
    {
      label: 'Issuer',
      value: nft?.issuer,
      addressData: nft?.issuer
        ? {
            address: nft.issuer,
            addressDetails: nft.issuerDetails
          }
        : null
    },
    { label: 'NFT ID', value: id, link: id ? `/nft/${id}` : '' }
  ].filter((item) => item.value !== undefined && item.value !== null && item.value !== '')

export const TransactionNftPreviewLink = ({ preview, size = 180, className = '', withTitle = false }) => {
  if (!preview?.nft || !preview?.id) return null

  const title = nftName(preview.nft) || shortHash(preview.id)
  const radius = size > 60 ? 8 : 6

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      <Link
        href={`/nft/${preview.id}`}
        className={className}
        title={title}
        onClick={(event) => event.stopPropagation()}
        style={{
          display: 'inline-flex',
          width: size,
          height: size,
          borderRadius: radius,
          overflow: 'hidden',
          lineHeight: 0,
          border: '1px solid color-mix(in srgb, var(--border-color) 76%, var(--text-secondary))',
          background: 'color-mix(in srgb, var(--background-input) 90%, var(--text-main) 10%)'
        }}
      >
        <NftImage
          nft={preview.nft}
          style={{
            width: '100%',
            height: '100%',
            marginRight: 0,
            borderRadius: radius,
            objectFit: 'cover',
            verticalAlign: 'middle'
          }}
        />
      </Link>
      {withTitle && (
        <span className="grey" style={{ maxWidth: size, fontSize: 12, lineHeight: 1.25 }}>
          {title}
        </span>
      )}
    </span>
  )
}

export const TransactionNftPreviewPanel = ({ preview }) => {
  if (!preview?.nft || !preview?.id) return null

  const title = nftName(preview.nft, { maxLength: 80 }) || 'NFT'
  const details = nftDetails(preview.nft, title, preview.id)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        flexWrap: 'wrap',
        padding: 14,
        margin: '8px 0 12px',
        borderRadius: 8,
        border: '1px solid color-mix(in srgb, var(--border-color) 78%, var(--text-secondary))',
        background: 'color-mix(in srgb, var(--background-input) 84%, transparent)',
        boxShadow: '0 8px 22px rgba(0, 0, 0, 0.08)',
        textAlign: 'left'
      }}
    >
      <TransactionNftPreviewLink preview={preview} size={180} />
      <div style={{ minWidth: 0, flex: '1 1 240px', maxWidth: 520 }}>
        {details.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'max-content minmax(0, 1fr)',
              gap: '7px 16px',
              lineHeight: 1.3,
              textAlign: 'left'
            }}
          >
            {details.map((item) => (
              <span key={item.label} style={{ display: 'contents' }}>
                <span className="grey bold">{item.label}</span>
                <span style={{ minWidth: 0, overflowWrap: 'anywhere', textAlign: 'left' }}>
                  {item.addressData ? (
                    <span className="copy-inline">
                      <AddressWithIconInline data={item.addressData} options={{ short: 8 }} />{' '}
                      <CopyButton text={item.value} />
                    </span>
                  ) : item.link ? (
                    <span className="copy-inline">
                      <Link href={item.link}>{shortHash(item.value, 8)}</Link> <CopyButton text={item.value} />
                    </span>
                  ) : (
                    item.value
                  )}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
