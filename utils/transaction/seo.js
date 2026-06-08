import { nativeCurrency, tokenImageSrc } from '..'
import { niceCurrency, shortHash, shortNiceNumber } from '../format'
import { nftUrl } from '../nft'
import { addressBalanceChanges, getTransactionTypeLabel, isConvertionTx, shortErrorCode } from './index'
import { getTransactionNftPreview } from './nftPreview'

const compactText = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()

const entityName = (entity, fallbackLength = 5) => {
  if (!entity) return ''
  if (typeof entity === 'string') return shortHash(entity, fallbackLength)

  const address = entity.address || entity.account || entity.issuer || entity.Account
  const details = entity.addressDetails || entity.accountDetails || entity.issuerDetails || entity

  return details?.service || details?.username || entity.service || entity.username || shortHash(address, fallbackLength)
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
  const fiatRate = fiatRates?.[selectedCurrency]

  if (isConvertionTx(specification)) {
    const changes = addressBalanceChanges(data, specification?.source?.address || data?.tx?.Account) || []
    const nonFeeChanges = changes.filter((change) => Number(change?.value) !== 0)
    const exchanged = nonFeeChanges.slice(0, 2).map((change) => plainAmount(change, { absolute: true }))
    return {
      headline: 'Exchange',
      description: exchanged.length === 2 ? `${source} exchanged ${exchanged[0]} for ${exchanged[1]}.` : `${source} made an exchange.`
    }
  }

  const delivered = outcome?.deliveredAmount || specification?.amount
  const deliveredText = fiatOrAmount(delivered, selectedCurrency, fiatRate)

  return {
    headline: destination ? `Payment to ${destination}` : 'Payment',
    description: compactText(`${source} sent ${deliveredText || 'a payment'}${destination ? ` to ${destination}` : ''}.`),
    amount: deliveredText,
    image: amountTokenImage(delivered)
  }
}

const trustSetSummary = (data) => {
  const { specification } = data
  const source = entityName(specification?.source)
  const counterparty = entityName({
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
    )
  }
}

const offerSummary = (data, selectedCurrency) => {
  const { tx, specification, fiatRates } = data
  const source = entityName(specification?.source)
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
        )
  }
}

const ammSummary = (data) => {
  const txType = data?.tx?.TransactionType
  const source = entityName(data?.specification?.source)
  const label = getTransactionTypeLabel(txType)
  const assets = [data?.tx?.Amount, data?.tx?.Amount2, data?.specification?.asset, data?.specification?.asset2]
    .map(currencyName)
    .filter(Boolean)
  const pair = Array.from(new Set(assets)).slice(0, 2).join('/')

  return {
    headline: pair ? `${label} ${pair}` : label,
    description: compactText(`${source} submitted ${label.toLowerCase()}${pair ? ` for ${pair}` : ''}.`)
  }
}

const nftSummary = (data, selectedCurrency) => {
  const { tx, specification, fiatRates } = data
  const txType = tx?.TransactionType
  const source = entityName(specification?.source)
  const label = getTransactionTypeLabel(txType)
  const amount = firstRelevantBalanceChange(data) || specification?.amount
  const amountText = amount ? fiatOrAmount(amount, selectedCurrency, fiatRates?.[selectedCurrency]) : ''
  const preview = getTransactionNftPreview(data)
  const nftText = preview?.id ? ` NFT ${shortHash(preview.id, 4)}` : ' NFT'

  return {
    headline: label,
    description: compactText(`${source} ${label.toLowerCase()}${nftText}${amountText ? ` for ${amountText}` : ''}.`)
  }
}

const checkSummary = (data, selectedCurrency) => {
  const { tx, specification, outcome, fiatRates } = data
  const source = entityName(specification?.source)
  const destination = entityName(specification?.destination)
  const label = getTransactionTypeLabel(tx?.TransactionType)
  const amount = outcome?.deliveredAmount || specification?.sendMax || specification?.amount
  const amountText = amount ? fiatOrAmount(amount, selectedCurrency, fiatRates?.[selectedCurrency]) : ''

  return {
    headline: label,
    description: compactText(`${source} ${label.toLowerCase()}${destination ? ` for ${destination}` : ''}${amountText ? ` (${amountText})` : ''}.`)
  }
}

const genericSummary = (data) => {
  const txType = data?.tx?.TransactionType
  const source = entityName(data?.specification?.source || { address: data?.tx?.Account })
  const label = getTransactionTypeLabel(txType)

  return {
    headline: label,
    description: compactText(`${source} submitted ${label.toLowerCase()}.`)
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
  const ledgerText = data?.outcome?.ledgerIndex ? `Ledger #${data.outcome.ledgerIndex}.` : data?.validated ? 'Validated transaction.' : 'Not yet validated.'
  const resultText = failed ? `Failed: ${shortErrorCode(result)}.` : successful ? 'Successful transaction.' : ''
  const description = compactText(`${summary.description} ${resultText} ${ledgerText} Tx ${shortTxHash}.`)
  const nftPreview = getTransactionNftPreview(data)
  const nftPreviewImage = nftPreview?.nft ? nftUrl(nftPreview.nft, 'preview') : ''
  const summaryImage = summary.image || ''
  const imageCandidate = summaryImage || nftPreviewImage
  const image = /^https:\/\/cdn\.(bithomp|xahauexplorer)\.com\//.test(imageCandidate) ? imageCandidate : ''
  const titleAmount = summary.amount ? `${summary.amount} ` : ''
  const title = compactText(`${statusLabel} ${titleAmount}${summary.headline} | Tx ${shortTxHash}`)

  return {
    title,
    description,
    shortTxHash,
    status: failed ? 'failed' : successful ? 'success' : 'pending',
    statusLabel,
    type: txType,
    typeLabel: getTransactionTypeLabel(txType),
    amount: summary.amount || '',
    image
  }
}
