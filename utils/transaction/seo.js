import { nativeCurrency, tokenImageSrc } from '..'
import { niceCurrency, shortHash, shortNiceNumber } from '../format'
import { nftUrl } from '../nft'
import { addressBalanceChanges, getTransactionTypeLabel, isConvertionTx, shortErrorCode } from './index'
import { getTransactionNftPreview } from './nftPreview'

const compactText = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()

const entityName = (entity, fallbackLengthOrOptions = 5) => {
  if (!entity) return ''
  const options =
    typeof fallbackLengthOrOptions === 'object'
      ? fallbackLengthOrOptions
      : { fallbackLength: fallbackLengthOrOptions }
  const fallbackLength = options.fallbackLength || 5
  const fallbackAddress = (address) => (options.fullAddressFallback ? address || '' : shortHash(address, fallbackLength))

  if (typeof entity === 'string') return fallbackAddress(entity)

  const address = entity.address || entity.account || entity.issuer || entity.Account
  const details = entity.addressDetails || entity.accountDetails || entity.issuerDetails || entity

  return details?.service || details?.username || entity.service || entity.username || fallbackAddress(address)
}

const previewEntityName = (entity) => entityName(entity, { fullAddressFallback: true })

const entityLabel = (entity) => {
  if (!entity || typeof entity === 'string') return ''

  const details = entity.addressDetails || entity.accountDetails || entity.issuerDetails || entity
  return details?.service || details?.username || entity.service || entity.username || ''
}

const currencyName = (amountOrCurrency) => {
  if (!amountOrCurrency) return ''
  if (typeof amountOrCurrency === 'string') return niceCurrency(amountOrCurrency)
  return amountOrCurrency.currencyDetails?.currency || niceCurrency(amountOrCurrency.currency || nativeCurrency)
}

const amountValue = (amount) => {
  if (!amount && amount !== 0) return null
  if (typeof amount === 'string' || typeof amount === 'number') return Number(amount) / 1000000
  return Number(amount.value)
}

const plainAmount = (amount, options = {}) => {
  const value = amountValue(amount)
  if (!Number.isFinite(value)) return ''

  const absValue = options.absolute ? Math.abs(value) : value
  const currency = typeof amount === 'object' ? currencyName(amount) : nativeCurrency
  return compactText(`${shortNiceNumber(absValue, 2, 2)} ${currency}`)
}

const amountTokenImage = (amount) => {
  if (!amount) return ''
  if (typeof amount === 'string' || typeof amount === 'number') {
    return tokenImageSrc({ currency: nativeCurrency }, 35)
  }
  if (typeof amount !== 'object') return ''
  if (amount.currencyDetails?.type === 'lp_token') return ''

  const image = tokenImageSrc(amount, 35)
  if (!image) return ''

  return image
}

const fiatAmount = (amount, selectedCurrency, fiatRate) => {
  if (!amount || !selectedCurrency) return ''

  const currencyKey = selectedCurrency.toLowerCase()
  const precomputed = typeof amount === 'object' ? Number(amount.valueInConvertCurrencies?.[currencyKey]) : null
  if (Number.isFinite(precomputed)) return shortNiceNumber(Math.abs(precomputed), 2, 2, selectedCurrency)

  const value = amountValue(amount)
  if (!Number.isFinite(value) || !fiatRate) return ''

  const isNativeObject = typeof amount === 'object' && (!amount.currency || amount.currency === nativeCurrency) && !amount.issuer
  const isNativeDrops = typeof amount === 'string' || typeof amount === 'number'
  if (!isNativeObject && !isNativeDrops) return ''

  return shortNiceNumber(Math.abs(value * fiatRate), 2, 2, selectedCurrency)
}

const fiatOrAmount = (amount, selectedCurrency, fiatRate) => {
  const fiat = fiatAmount(amount, selectedCurrency, fiatRate)
  return fiat ? `~${fiat}` : plainAmount(amount, { absolute: true })
}

const previewDetail = (data, shortTxHash) => {
  const parts = []
  const ledgerTimestamp = Number(data?.outcome?.ledgerTimestamp)

  if (Number.isFinite(ledgerTimestamp)) {
    parts.push(new Date(ledgerTimestamp * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC')
  }

  if (data?.outcome?.ledgerIndex) {
    parts.push(`Ledger #${data.outcome.ledgerIndex}`)
  }

  if (shortTxHash) {
    parts.push(`Tx ${shortTxHash}`)
  }

  return compactText(parts.join(' | '))
}

const firstRelevantBalanceChange = (data) => {
  const sourceAddress = data?.specification?.source?.address || data?.tx?.Account
  try {
    return addressBalanceChanges(data, sourceAddress)?.find((change) => Number(change?.value) !== 0) || null
  } catch {
    return null
  }
}

const paymentSummary = (data, selectedCurrency) => {
  const { specification, outcome, fiatRates } = data
  const source = entityName(specification?.source)
  const destination = entityName(specification?.destination)
  const previewSource = previewEntityName(specification?.source)
  const previewDestination = previewEntityName(specification?.destination)
  const previewDestinationLabel = entityLabel(specification?.destination)
  const fiatRate = fiatRates?.[selectedCurrency]

  if (isConvertionTx(specification)) {
    const changes = addressBalanceChanges(data, specification?.source?.address || data?.tx?.Account) || []
    const nonFeeChanges = changes.filter((change) => Number(change?.value) !== 0)
    const exchanged = nonFeeChanges.slice(0, 2).map((change) => plainAmount(change, { absolute: true }))
    return {
      headline: 'Exchange',
      description: exchanged.length === 2 ? `${source} exchanged ${exchanged[0]} for ${exchanged[1]}.` : `${source} made an exchange.`,
      previewTitle: 'Exchange',
      previewSubtitle: previewSource ? `By ${previewSource}` : '',
      previewAmount: exchanged.length === 2 ? `${exchanged[0]} for ${exchanged[1]}` : ''
    }
  }

  const delivered = outcome?.deliveredAmount || specification?.amount
  const deliveredText = fiatOrAmount(delivered, selectedCurrency, fiatRate)

  return {
    headline: destination ? `Payment to ${destination}` : 'Payment',
    description: compactText(`${source} sent ${deliveredText || 'a payment'}${destination ? ` to ${destination}` : ''}.`),
    amount: deliveredText,
    previewTitle: previewDestinationLabel ? `Payment to ${previewDestinationLabel}` : 'Payment',
    previewSubtitle: compactText(`${previewSource ? `From ${previewSource}` : ''}${!previewDestinationLabel && previewDestination ? ` to ${previewDestination}` : ''}`),
    previewAmount: deliveredText,
    image: amountTokenImage(delivered)
  }
}

const trustSetSummary = (data) => {
  const { specification } = data
  const source = entityName(specification?.source)
  const previewSource = previewEntityName(specification?.source)
  const counterparty = entityName({
    address: specification?.counterparty,
    addressDetails: specification?.counterpartyDetails
  })
  const previewCounterparty = previewEntityName({
    address: specification?.counterparty,
    addressDetails: specification?.counterpartyDetails
  })
  const currency = currencyName(specification?.currency)
  const removed = specification?.limit === '0'
  const limit = Number(specification?.limit)
  const limitText = Number.isFinite(limit) && !removed ? ` with a ${shortNiceNumber(limit, 2, 2)} ${currency} limit` : ''

  return {
    headline: `${removed ? 'Trust line removed' : 'Trust line set'}${currency ? ` for ${currency}` : ''}`,
    description: compactText(
      `${source} ${removed ? 'removed' : 'set'} a ${currency || 'token'} trust line${counterparty ? ` with ${counterparty}` : ''}${limitText}.`
    ),
    previewSubtitle: compactText(`${previewSource}${previewCounterparty ? ` with ${previewCounterparty}` : ''}`)
  }
}

const offerSummary = (data, selectedCurrency) => {
  const { tx, specification, fiatRates } = data
  const source = entityName(specification?.source)
  const previewSource = previewEntityName(specification?.source)
  const fiatRate = fiatRates?.[selectedCurrency]
  const isCancel = tx?.TransactionType === 'OfferCancel'
  const sellOrder = !!specification?.flags?.sell
  const gets = specification?.takerGets
  const pays = specification?.takerPays
  const pair = [currencyName(gets), currencyName(pays)].filter(Boolean).join('/')

  return {
    headline: isCancel ? 'Offer canceled' : `${sellOrder ? 'Sell' : 'Buy'} order${pair ? ` ${pair}` : ''}`,
    description: isCancel
      ? compactText(`${source} canceled an offer${specification?.orderSequence ? ` #${specification.orderSequence}` : ''}.`)
      : compactText(
          `${source} placed a ${sellOrder ? 'sell' : 'buy'} order${gets ? ` for ${fiatOrAmount(gets, selectedCurrency, fiatRate)}` : ''}${
            pays ? ` against ${fiatOrAmount(pays, selectedCurrency, fiatRate)}` : ''
          }.`
        ),
    previewSubtitle: previewSource ? `By ${previewSource}` : '',
    previewAmount: !isCancel
      ? compactText(
          `${gets ? fiatOrAmount(gets, selectedCurrency, fiatRate) : ''}${pays ? ` against ${fiatOrAmount(pays, selectedCurrency, fiatRate)}` : ''}`
        )
      : ''
  }
}

const ammSummary = (data) => {
  const txType = data?.tx?.TransactionType
  const source = entityName(data?.specification?.source)
  const previewSource = previewEntityName(data?.specification?.source)
  const label = getTransactionTypeLabel(txType)
  const assets = [data?.tx?.Amount, data?.tx?.Amount2, data?.specification?.asset, data?.specification?.asset2]
    .map(currencyName)
    .filter(Boolean)
  const pair = Array.from(new Set(assets)).slice(0, 2).join('/')

  return {
    headline: pair ? `${label} ${pair}` : label,
    description: compactText(`${source} submitted ${label.toLowerCase()}${pair ? ` for ${pair}` : ''}.`),
    previewSubtitle: previewSource ? `By ${previewSource}` : ''
  }
}

const nftSummary = (data, selectedCurrency) => {
  const { tx, specification, fiatRates } = data
  const txType = tx?.TransactionType
  const source = entityName(specification?.source)
  const previewSource = previewEntityName(specification?.source)
  const label = getTransactionTypeLabel(txType)
  const amount = firstRelevantBalanceChange(data) || specification?.amount
  const amountText = amount ? fiatOrAmount(amount, selectedCurrency, fiatRates?.[selectedCurrency]) : ''
  const preview = getTransactionNftPreview(data)
  const nftText = preview?.id ? ` NFT ${shortHash(preview.id, 4)}` : ' NFT'

  return {
    headline: label,
    description: compactText(`${source} ${label.toLowerCase()}${nftText}${amountText ? ` for ${amountText}` : ''}.`),
    previewSubtitle: previewSource ? `By ${previewSource}` : '',
    previewAmount: amountText
  }
}

const checkSummary = (data, selectedCurrency) => {
  const { tx, specification, outcome, fiatRates } = data
  const source = entityName(specification?.source)
  const destination = entityName(specification?.destination)
  const previewSource = previewEntityName(specification?.source)
  const previewDestination = previewEntityName(specification?.destination)
  const label = getTransactionTypeLabel(tx?.TransactionType)
  const amount = outcome?.deliveredAmount || specification?.sendMax || specification?.amount
  const amountText = amount ? fiatOrAmount(amount, selectedCurrency, fiatRates?.[selectedCurrency]) : ''

  return {
    headline: label,
    description: compactText(`${source} ${label.toLowerCase()}${destination ? ` for ${destination}` : ''}${amountText ? ` (${amountText})` : ''}.`),
    previewSubtitle: compactText(`${previewSource}${previewDestination ? ` to ${previewDestination}` : ''}`),
    previewAmount: amountText
  }
}

const genericSummary = (data) => {
  const txType = data?.tx?.TransactionType
  const source = entityName(data?.specification?.source || { address: data?.tx?.Account })
  const previewSource = previewEntityName(data?.specification?.source || { address: data?.tx?.Account })
  const label = getTransactionTypeLabel(txType)

  return {
    headline: label,
    description: compactText(`${source} submitted ${label.toLowerCase()}.`),
    previewSubtitle: previewSource ? `By ${previewSource}` : ''
  }
}

const transactionSummary = (data, selectedCurrency) => {
  const txType = data?.tx?.TransactionType

  if (txType === 'Payment') return paymentSummary(data, selectedCurrency)
  if (txType === 'TrustSet') return trustSetSummary(data)
  if (txType === 'OfferCreate' || txType === 'OfferCancel') return offerSummary(data, selectedCurrency)
  if (txType?.includes('AMM')) return ammSummary(data)
  if (txType?.includes('NFToken')) return nftSummary(data, selectedCurrency)
  if (txType?.includes('Check')) return checkSummary(data, selectedCurrency)

  return genericSummary(data)
}

export const buildTransactionSeo = (data, selectedCurrency = 'usd') => {
  const txHash = data?.txHash || data?.tx?.hash || data?.id
  const txType = data?.tx?.TransactionType || 'Transaction'
  const shortTxHash = shortHash(txHash, 6)
  const result = data?.outcome?.result
  const successful = result === 'tesSUCCESS'
  const failed = result && !successful
  const summary = transactionSummary(data, selectedCurrency)
  const statusLabel = failed ? 'Failed' : successful ? 'Successful' : 'Pending'
  const titleStatus = failed ? 'Failed ' : successful ? '' : 'Pending '
  const ledgerText = data?.outcome?.ledgerIndex ? `Ledger #${data.outcome.ledgerIndex}.` : data?.validated ? 'Validated transaction.' : 'Not yet validated.'
  const resultText = failed ? `Failed: ${shortErrorCode(result)}.` : ''
  const description = compactText(`${summary.description} ${resultText} ${ledgerText} Tx ${shortTxHash}.`)
  const nftPreview = getTransactionNftPreview(data)
  const nftPreviewImage = nftPreview?.nft ? nftUrl(nftPreview.nft, 'preview') : ''
  const summaryImage = summary.image || ''
  const imageCandidate = summaryImage || nftPreviewImage
  const image = /^https:\/\/cdn\.(bithomp|xahauexplorer)\.com\//.test(imageCandidate) ? imageCandidate : ''
  const titleAmount = summary.amount ? `${summary.amount} ` : ''
  const title = compactText(`${titleStatus}${titleAmount}${summary.headline} | Tx ${shortTxHash}`)
  const previewTitle = summary.previewTitle || summary.headline || getTransactionTypeLabel(txType)
  const previewAmount = summary.previewAmount || summary.amount || ''

  return {
    title,
    description,
    shortTxHash,
    status: failed ? 'failed' : successful ? 'success' : 'pending',
    statusLabel,
    type: txType,
    typeLabel: getTransactionTypeLabel(txType),
    amount: summary.amount || '',
    previewTitle,
    previewSubtitle: summary.previewSubtitle || '',
    previewAmount,
    previewDetail: previewDetail(data, shortTxHash),
    image
  }
}
