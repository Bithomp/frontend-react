import { Buffer } from 'buffer'
import dayjs from 'dayjs'
import * as durationPlugin from 'dayjs/plugin/duration'
import * as relativeTimePlugin from 'dayjs/plugin/relativeTime'
import Link from 'next/link'
import { Trans } from 'next-i18next'

import CopyButton from '../components/UI/CopyButton'
import LinkIcon from '../public/images/link.svg'
import { mpUrl } from './nft'
import {
  avatarServer,
  devNet,
  nativeCurrency,
  nativeCurrenciesImages,
  stripText,
  xls14NftValue,
  tokenImageSrc,
  mptokenImageSrc
} from '.'
import { scaleAmount, subtract } from './calc'
import { LinkAmm, LinkToken } from './links'

dayjs.extend(durationPlugin)
dayjs.extend(relativeTimePlugin)

export const formatXDigits = (value, x = 10) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''

  const abs = Math.abs(n)

  // how many digits before the decimal
  const intDigits = abs >= 1 ? Math.floor(Math.log10(abs)) + 1 : 0

  // how many decimals we need to reach total = x
  const decimals = Math.max(0, x - intDigits)

  // format + trim trailing zeros + trim dot if needed
  return n.toFixed(decimals).replace(/\.?0+$/, '')
}

export const transferRateToPercent = (transferRate) => {
  if (transferRate === null || transferRate === undefined) return ''
  return Math.ceil(subtract(transferRate, 1) * 10000) / 100 + '%'
}

export const serviceUsernameOrAddressText = (data, name = 'address', options) => {
  if (!data || !data[name]) return ''
  const address = data[name]
  const { service, username } = data[name + 'Details'] || {}
  if (service) {
    return service
  } else if (username) {
    return username
  } else if (options?.fullAddress) {
    return address
  } else {
    return shortHash(address)
  }
}

export const NiceNativeBalance = ({ amount }) => {
  return (
    <span className="tooltip">
      {shortNiceNumber(amount / 1000000, 2, 1) + ' ' + nativeCurrency}
      <span className="tooltiptext no-brake">
        {fullNiceNumber(amount / 1000000)} {nativeCurrency}
      </span>
    </span>
  )
}

export const TokenImage = ({ token }) => {
  const size = 16
  const placeholder = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
     <rect width="100%" height="100%" fill="#ffffff"/>
     <text x="50%" y="50%" font-family="sans-serif" font-size="8" text-anchor="middle" dominant-baseline="central" fill="#9aa0a6">
      ;(
     </text>
   </svg>`
  )}`

  return (
    <div
      style={{
        height: size,
        width: size,
        display: 'inline-block',
        overflow: 'hidden',
        borderRadius: '50%',
        verticalAlign: 'text-bottom',
        marginRight: 3,
        backgroundColor: '#fff',
        boxShadow: '0 0 0 1px #fff'
      }}
    >
      <img
        src={tokenImageSrc(token)}
        alt="token"
        height={size}
        width={size}
        style={{
          objectFit: 'cover'
        }}
        onError={(e) => {
          e.target.onerror = null
          e.target.src = placeholder
        }}
      />
    </div>
  )
}

export const CurrencyWithIcon = ({ token, copy, hideIssuer, options }) => {
  if (!token) return ''

  if (!token?.mptId) token.mptId = token.mptokenIssuanceID || token.MPTokenIssuanceID || token.mpt_issuance_id

  if (token.mptId) {
    if (!token.issuer) {
      token.issuer = token.mptokenCurrencyDetails?.account || token.Issuer || null
      token.issuerDetails = token.mptokenCurrencyDetails?.accountDetails || token.issuerDetails || null
    }
    if (!token.metadata) {
      token.metadata = token.mptokenCurrencyDetails?.metadata || null
    }
  }

  const { currencyDetails, issuer, mptId, currency } = token
  const disableTokenLink = options?.disableTokenLink

  let imageUrl = avatarServer + issuer

  if (mptId) {
    imageUrl = mptokenImageSrc(mptId)
  } else {
    imageUrl = tokenImageSrc(token)
  }

  if (!issuer) {
    imageUrl = nativeCurrenciesImages[nativeCurrency]
  }

  let doubleIcon = false
  let assetImageUrl, asset2ImageUrl

  // LP token - show 2 icons
  if (currencyDetails?.asset && currencyDetails?.asset2) {
    doubleIcon = true
    assetImageUrl = tokenImageSrc(currencyDetails.asset)
    asset2ImageUrl = tokenImageSrc(currencyDetails.asset2)
  }

  const tokenText =
    mptId && token.metadata
      ? token.metadata?.t || token.metadata?.c || token.metadata?.currency || currency || 'N/A'
      : currencyDetails?.type === 'lp_token' && currencyDetails?.currency
        ? currencyDetails.currency
        : niceCurrency(currency)

  const iconNode = doubleIcon ? (
    <div style={{ position: 'relative', width: 35, height: 35, verticalAlign: 'middle' }}>
      {/* back coin */}
      <img
        alt="asset"
        src={assetImageUrl}
        width={22}
        height={22}
        style={{
          position: 'absolute',
          top: 1,
          left: 1,
          borderRadius: '50%',
          objectFit: 'cover',
          backgroundColor: '#fff',
          border: '1px solid #fff',
          boxSizing: 'border-box'
        }}
      />
      {/* front coin */}
      <img
        alt="asset 2"
        src={asset2ImageUrl}
        width={22}
        height={22}
        style={{
          position: 'absolute',
          bottom: 1,
          left: 13, // slight shift right to overlap
          borderRadius: '50%',
          objectFit: 'cover',
          zIndex: 2,
          backgroundColor: '#fff',
          border: '1px solid #fff',
          boxSizing: 'border-box'
        }}
      />
    </div>
  ) : (
    <img
      alt="avatar"
      src={imageUrl}
      width="35"
      height="35"
      style={{
        borderRadius: '50%',
        objectFit: 'cover',
        backgroundColor: '#fff',
        border: '1px solid #fff',
        boxSizing: 'border-box',
        verticalAlign: 'middle'
      }}
    />
  )

  if (options?.iconOnly) {
    return iconNode
  }

  return (
    <>
      <table style={{ minWidth: 126 }}>
        <tbody>
          <tr className="no-border">
            <td style={{ padding: 0, width: 35, height: 35 }}>{iconNode}</td>
            <td className="left" style={{ padding: '0 0 0 5px' }}>
              {disableTokenLink ? <span className="bold">{tokenText}</span> : <LinkToken token={token} />}
              {copy && (
                <>
                  {' '}
                  <CopyButton text={currency} copyText="Copy code" />
                </>
              )}
              {!doubleIcon && !hideIssuer && (
                <>
                  <br />
                  {mptId ? (
                    <>{addressUsernameOrServiceLink(token, 'issuer', options)}</>
                  ) : (
                    <span className="grey text-xs">{serviceUsernameOrAddressText(token, 'issuer')}</span>
                  )}
                </>
              )}
            </td>
          </tr>
        </tbody>
      </table>
      {token?.flags && <div>{showFlags(token.flags)}</div>}
    </>
  )
}

export const CurrencyWithIconInline = ({ token, copy, link, linkIcon, showIssuer = false }) => {
  if (!token) return ''
  const { lp_token, currencyDetails } = token
  const currencyText = lp_token ? currencyDetails?.currency : niceCurrency(token.currency)

  if (linkIcon) {
    const tokenUrl = token.issuer ? `/token/${token.issuer}/${token.currency}` : null
    return (
      <>
        <TokenImage token={token} />
        <strong>{currencyText}</strong>
        {showIssuer && token?.issuer && <> ({addressUsernameOrServiceLink(token, 'issuer', { short: 6 })})</>}
        {tokenUrl && (
          <Link href={tokenUrl} className="inline-link-icon tooltip" style={{ marginLeft: 3 }}>
            <LinkIcon />
            <span className="tooltiptext no-brake">Token page</span>
          </Link>
        )}
      </>
    )
  }

  return (
    <>
      <TokenImage token={token} />
      {link && !lp_token ? <LinkToken token={token} showIssuer={showIssuer} /> : currencyText}
      {!link && showIssuer && token?.issuer && (
        <> ({serviceUsernameOrAddressText(token, 'issuer') || shortHash(token.issuer, 6)})</>
      )}
      {copy && (
        <>
          {' '}
          <CopyButton text={token.currency} copyText="Copy code" />
        </>
      )}
    </>
  )
}

export const AddressWithIconInline = ({ data, name = 'address', options }) => {
  if (!data || !data[name]) return ''
  const address = data[name]
  const size = 16
  const placeholder = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
     <rect width="100%" height="100%" fill="#ffffff"/>
     <text x="50%" y="50%" font-family="sans-serif" font-size="8" text-anchor="middle" dominant-baseline="central" fill="#9aa0a6">
      ;(
     </text>
   </svg>`
  )}`

  return (
    <span className="no-brake">
      <Link href={'/account/' + address}>
        <div
          style={{
            height: size,
            width: size,
            verticalAlign: 'text-bottom',
            marginRight: 3,
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'inline-block'
          }}
        >
          <img
            src={avatarServer + address + '?hashIconZoom=12' || placeholder}
            alt={data?.[name?.toLowerCase() + 'Details']?.service || 'service logo'}
            height={size}
            width={size}
            style={{
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.onerror = null
              e.target.src = placeholder
            }}
          />
        </div>
      </Link>
      {options?.showAddress ? (
        <Link href={'/account/' + address}>{shortAddress(address, options?.short || 6)}</Link>
      ) : (
        addressUsernameOrServiceLink(data, name, options)
      )}
    </span>
  )
}

export const AddressWithIcon = ({ children, address }) => {
  let imageUrl = address ? avatarServer + address + '?hashIconZoom=12' : nativeCurrenciesImages[nativeCurrency]
  return (
    <table style={{ minWidth: 126 }}>
      <tbody>
        <tr className="no-border">
          <td style={{ padding: 0, width: 35, height: 35 }}>
            <div
              style={{
                width: 35,
                height: 35,
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'inline-block',
                verticalAlign: 'middle',
                lineHeight: 0
              }}
            >
              <img
                alt="avatar"
                src={imageUrl}
                width="35"
                height="35"
                style={{
                  objectFit: 'cover'
                }}
              />
            </div>
          </td>
          <td style={{ padding: '0 0 0 5px' }}>{children}</td>
        </tr>
      </tbody>
    </table>
  )
}

export const AddressWithIconFilled = ({ data, name, copyButton, options }) => {
  if (!data) return ''
  if (!name) {
    name = 'address'
  }
  const link = userOrServiceLink(data, name)
  return (
    <AddressWithIcon address={data[name]}>
      {link && (
        <>
          {link}
          <br />
        </>
      )}
      <span className="brake">{addressLink(data[name], options)}</span> {copyButton && <CopyButton text={data[name]} />}
    </AddressWithIcon>
  )
}

// Universal fiat helper: works for both native currency and IOU/MPT tokens.
// For token amounts, uses the pre-computed valueInConvertCurrencies embedded in the
// amount object (provided by the API) when available, or falls back to tokenFiatRate.
export const tokenToFiat = (params) => {
  if (devNet) return ''
  const { amount, selectedCurrency, fiatRate, tokenFiatRate } = params
  if (!amount || amount === '0' || !selectedCurrency) return ''

  const currencyKey = selectedCurrency.toLowerCase()
  let currency = ''
  let initialAmount
  let calculatedAmount
  let effectiveFiatRate
  let precomputedFiat = null // pre-computed fiat total from API (for tokens)

  if (!amount?.currency) {
    // native currency in drops (string or number)
    if (!fiatRate) return ''
    initialAmount = amount / 1000000
    currency = nativeCurrency
    effectiveFiatRate = fiatRate
  } else {
    initialAmount = amount.value
    currency = niceCurrency(amount.currency)
    if (!amount.issuer && !amount.mpt_issuance_id) {
      // native currency as an amount object e.g. { currency: 'XRP', value: '1.5' }
      if (!fiatRate) return ''
      effectiveFiatRate = fiatRate
    } else {
      // LP token details can include token value + native spot price.
      // Convert token units to native and then apply fiat rate.
      const amountValue = Number(initialAmount)
      const priceInNative = Number(amount?.priceNativeCurrencySpot)
      if (Number.isFinite(amountValue) && Number.isFinite(priceInNative) && fiatRate) {
        precomputedFiat = amountValue * priceInNative * fiatRate
        effectiveFiatRate = priceInNative * fiatRate
      }

      // IOU / MPT token: use the pre-computed value embedded in the amount when available
      const embedded = precomputedFiat === null ? amount.valueInConvertCurrencies?.[currencyKey] : undefined
      if (embedded !== undefined) {
        precomputedFiat = Number(embedded)
        const absTokenAmount = Math.abs(Number(initialAmount) || 0)
        // derive per-unit rate for the tooltip
        effectiveFiatRate = absTokenAmount > 0 ? Math.abs(precomputedFiat) / absTokenAmount : 0
      } else if (precomputedFiat === null && tokenFiatRate) {
        effectiveFiatRate = tokenFiatRate
      } else if (precomputedFiat === null) {
        return ''
      } else {
        const absTokenAmount = Math.abs(Number(initialAmount) || 0)
        if (!effectiveFiatRate && absTokenAmount > 0) {
          effectiveFiatRate = Math.abs(precomputedFiat) / absTokenAmount
        }
      }
    }
  }

  const absolute = Math.abs(initialAmount)

  if (params.absolute) {
    initialAmount = absolute
    if (precomputedFiat !== null) precomputedFiat = Math.abs(precomputedFiat)
  }

  const fiatAmount = precomputedFiat !== null ? precomputedFiat : initialAmount * effectiveFiatRate

  if (absolute > 1) {
    calculatedAmount = shortNiceNumber(fiatAmount, 2, 1, selectedCurrency)
  } else {
    calculatedAmount = niceNumber(fiatAmount, null, selectedCurrency, 6)
  }

  if (params.asText) {
    return '≈' + calculatedAmount
  }

  return (
    <span className="tooltip no-brake" suppressHydrationWarning>
      {' '}
      ≈ {calculatedAmount}
      <span
        className={'tooltiptext no-brake' + (params?.tooltipDirection ? ' ' + params.tooltipDirection : '')}
        suppressHydrationWarning
      >
        1 {currency} = {shortNiceNumber(effectiveFiatRate, 2, 1, selectedCurrency)}
      </span>
    </span>
  )
}

export const acceptNftBuyOfferButton = (t, setSignRequest, offer) => {
  return (
    <button
      className="button-action wide center"
      onClick={() =>
        setSignRequest({
          offerAmount: offer.amount,
          offerType: 'buy',
          request: {
            TransactionType: 'NFTokenAcceptOffer',
            NFTokenBuyOffer: offer.offerIndex
          }
        })
      }
    >
      {t('button.nft.sell-for-amount', { amount: amountFormat(offer.amount) })}
    </button>
  )
}

export const acceptNftSellOfferButton = (t, setSignRequest, offer, nftType = 'xls20') => {
  let request = null
  if (nftType === 'xls35') {
    request = {
      Amount: offer.amount,
      TransactionType: 'URITokenBuy',
      URITokenID: offer.nftokenID
    }
  } else {
    request = {
      TransactionType: 'NFTokenAcceptOffer',
      NFTokenSellOffer: offer.offerIndex
    }
  }

  return (
    <button
      className="button-action wide center"
      onClick={() =>
        setSignRequest({
          offerAmount: offer.amount,
          offerType: 'sell',
          request
        })
      }
    >
      {offer.amount === '0' || !offer.amount
        ? t('button.nft.accept-transfer')
        : t('button.nft.buy-for-amount', { amount: amountFormat(offer.amount) })}
    </button>
  )
}

export const cancelNftOfferButtons = (t, setSignRequest, account, data) => {
  if (!data || !account) return null

  //for offer cancelation
  let nftId = data.nftokenID

  if (data.sellOffers) {
    const sellOffers = data.sellOffers.filter(
      (offer) => !offer.acceptedAt && !offer.canceledAt && offer.owner === account
    )
    return sellOffers.map((offer, i) => {
      return (
        <div key={i}>
          {cancelNftOfferButton(t, setSignRequest, account, offer, 'sell', data.type, nftId)}
          <br />
          <br />
        </div>
      )
    })
  }
  if (data.buyOffers) {
    const buyOffers = data.buyOffers.filter(
      (offer) => !offer.acceptedAt && !offer.canceledAt && offer.owner === account
    )
    return buyOffers.map((offer, i) => {
      return (
        <div key={i}>
          {cancelNftOfferButton(t, setSignRequest, account, offer, 'buy', data.type, nftId)}
          <br />
          <br />
        </div>
      )
    })
  }
}

export const cancelNftOfferButton = (t, setSignRequest, account, offer, type = 'buy', nftType = 'xls20', nftId) => {
  let request = null
  if (nftType === 'xls35') {
    request = {
      Account: account,
      TransactionType: 'URITokenCancelSellOffer',
      URITokenID: nftId
    }
  } else {
    request = {
      TransactionType: 'NFTokenCancelOffer',
      Account: account,
      NFTokenOffers: [offer.offerIndex]
    }
  }

  return (
    <button
      className="button-action wide center"
      onClick={() =>
        setSignRequest({
          request
        })
      }
    >
      {offer.amount === '0' ? (
        t('button.nft.cancel-transfer')
      ) : (
        <>
          {type === 'sell'
            ? t('button.nft.cancel-sell-offer-for', { amount: amountFormat(offer.amount) })
            : t('button.nft.cancel-buy-offer-for', { amount: amountFormat(offer.amount) })}
        </>
      )}
    </button>
  )
}

//table
export const trStatus = (t, data) => {
  if (data.validationErrors && data.validationErrors.length > 0) {
    return (
      <tr>
        <td>{t('table.status')}</td>
        <td>
          {data.validationErrors.map((error, i) => (
            <span key={i} className="red">
              {t('table.text-status.' + error)}
            </span>
          ))}
        </td>
      </tr>
    )
  }
  if (data.canceledAt || data.acceptedAt) {
    return (
      <tr>
        <td>{t('table.status')}</td>
        <td className="red">{data.acceptedAt ? t('table.accepted') : t('table.canceled')}</td>
      </tr>
    )
  }
}

export const trWithFlags = (t, flags) => {
  /*
  "flags": {
    "burnable": false,
    "onlyXRP": false,
    "trustLine": false,
    "transferable": true //"xls-35" has only burnable
  },
  */
  let flagList = ''
  let count = 0
  let name = t('table.flags')

  for (let key in flags) {
    if (flags[key]) {
      //skip sellToken flag for tokenCreateOffer, we show it in the name
      if (key === 'sellToken') {
        continue
      }
      count++
      flagList += key + ', '
    }
  }
  flagList = flagList.slice(0, -2) // remove the last comma

  if (count === 1) {
    name = t('table.flag')
  }
  if (count === 0) {
    flagList = t('table.text.unspecified')
  }
  return (
    <tr>
      <td>{name}</td>
      <td>{flagList}</td>
    </tr>
  )
}

export const nftOfferLink = (nftOfferId, chars = 10) => {
  if (!nftOfferId) return ''
  return <Link href={'/nft-offer/' + nftOfferId}>{shortHash(nftOfferId, chars)}</Link>
}

export const nftIdLink = (nftId, chars = 10) => {
  if (!nftId) return ''
  return <Link href={'/nft/' + nftId}>{shortHash(nftId, chars)}</Link>
}

export const nftLink = (nft, type, options = {}) => {
  if (!nft || !type || !nft[type]) return ''

  let link = '/account/'
  if (type === 'issuer') {
    link = '/nft-explorer?issuer='
  } else if (type === 'owner' || type === 'seller' || type === 'buyer') {
    link = '/nfts/'
  }

  let defaultContent = <LinkIcon />
  if (options.address === 'short') {
    defaultContent = shortAddress(nft[type])
  } else if (options.address === 'full') {
    defaultContent = nft[type]
  }

  //nft-offers destination
  if (nft[type + 'Details']) {
    const { service, username } = nft[type + 'Details']

    if (type === 'destination' && nft.valid) {
      const url = mpUrl(nft)
      if (url) {
        return (
          <span>
            <Trans i18nKey="table.text.see-on">
              See on{' '}
              <a href={url} target="_blank" rel="noreferrer">
                <b className={service ? 'green' : username ? 'blue' : ''}>
                  {{ marketplace: service || username || '' }}
                </b>
              </a>
            </Trans>
          </span>
        )
      }
    }
    const showName = userOrServiceName(nft[type + 'Details'])
    return (
      <Link href={link + (nft[type + 'Details'].username || nft[type])}>{showName ? showName : defaultContent}</Link>
    )
  }
  return <Link href={link + nft[type]}>{defaultContent}</Link>
}

export const nftsExplorerLink = ({ owner, ownerDetails, issuer, issuerDetails, taxon }) => {
  if (!owner && !issuer) return ''
  let link = ''
  const issuerUri = issuerDetails?.username ? issuerDetails.username : issuer
  const ownerUri = ownerDetails?.username ? ownerDetails.username : owner
  if (issuer && owner) {
    link = '/nft-explorer?issuer=' + issuerUri + '&owner=' + ownerUri
  } else {
    if (issuer) {
      link = '/nft-explorer?issuer=' + issuerUri
    } else if (owner) {
      link = '/nft-explorer?owner=' + ownerUri
    }
  }
  if (taxon === 0 || taxon === '0' || taxon) {
    link += '&taxon=' + taxon
  }
  return (
    <Link href={link + '&includeWithoutMediaData=true'}>
      <LinkIcon />
    </Link>
  )
}

export const usernameOrAddress = (data, type) => {
  if (!data || !type || !data[type]) return ''
  if (data[type + 'Details']) {
    const { username } = data[type + 'Details']
    if (username) {
      return username
    }
  }
  return data[type]
}

export const userOrServiceLink = (data, type, options = {}) => {
  if (!data || !type || !data[type]) return ''
  if (!options.url) {
    options.url = '/account/'
  }

  const typeDetails = type.charAt(0).toLowerCase() + type.slice(1) + 'Details'

  if (data[typeDetails]) {
    const { username, service } = data[typeDetails]
    let link = username ? username : data[type]

    let buildLink = options?.url + link
    if (service) {
      let serviceName = service
      if (options.short && serviceName.length > 18) {
        serviceName = service.substring(0, 15).trim() + '...'
      }
      return (
        <Link href={buildLink} className="bold green">
          {serviceName}
        </Link>
      )
    }
    if (username) {
      return (
        <Link href={buildLink} className="bold blue">
          {username}
        </Link>
      )
    }
  }
  return ''
}

export const addressUsernameOrServiceLink = (data, type, options = {}) => {
  if (!options.url) {
    options.url = '/account/'
  }
  if (type === 'broker' && data?.broker === 'no broker') {
    return <b>{options.noBroker}</b>
  }
  if (userOrServiceLink(data, type) !== '') {
    return userOrServiceLink(data, type, options)
  }
  if (options.short) {
    return <Link href={options.url + data?.[type]}>{shortAddress(data?.[type], options.short)}</Link>
  }
  return <Link href={options.url + data?.[type]}>{data?.[type]}</Link>
}

export const addressLink = (address, options = {}) => {
  if (!address) return ''
  return (
    <Link href={'/account/' + address} aria-label="address link">
      {options?.short ? shortAddress(address, options.short) : address}
    </Link>
  )
}

export const userOrServiceName = (data) => {
  if (data) {
    const { service, username } = data
    if (service) {
      return <span className="green bold">{service}</span>
    }
    if (username) {
      return <span className="blue bold">{username}</span>
    }
  }
  return ''
}

export const shortHash = (id, n = 6) => {
  if (!id) return ''
  id = id.toString()
  return id.substr(0, n) + '...' + id.substr(-n)
}

export const shortAddress = (id, length = 6) => {
  if (!id) return ''
  if (length === true) {
    length = 6
  }
  return id.substr(0, length) + '...' + id.substr(-length)
}

export const convertedAmount = (nft, convertCurrency, options) => {
  if (nft?.amountInConvertCurrencies && nft.amountInConvertCurrencies?.[convertCurrency]) {
    if (options?.short) {
      return shortNiceNumber(nft.amountInConvertCurrencies[convertCurrency], 2, 3, convertCurrency)
    }
    return niceNumber(nft.amountInConvertCurrencies[convertCurrency], 2, convertCurrency)
  }
  return null
}

export const percentFormat = (small, big) => {
  if (!small && small !== 0) return
  if (!big && big !== 0) return
  if (small.value && big.value) {
    small = small.value
    big = big.value
  }
  small = Number(small)
  big = Number(big)
  if (big === 0) return '0%'
  return '(' + Math.floor(((small * 100) / big) * 100) / 100 + '%)'
}

export const amountFormat = (amount, options = {}) => {
  if (!amount && amount !== '0' && amount !== 0) {
    return ''
  }
  const { value, currency, valuePrefix, issuer, issuerDetails, type, originalCurrency } = amountParced(amount)

  const StyleAmount = ({ children }) => {
    if (options?.color === 'direction') {
      if (Number(value) > 0) {
        options.color = 'green'
      } else if (Number(value) < 0) {
        options.color = 'red'
      } else {
        options.color = null
      }
    }
    if (!options?.color && !options?.bold) return <>{children}</>
    const classes = [options.bold && 'bold', options.color].filter(Boolean).join(' ')
    return <span className={classes}>{children}</span>
  }

  let textCurrency = currency
  if (options.noSpace) {
    textCurrency = textCurrency?.trim()
  }

  if (!isNaN(textCurrency?.trim())) {
    textCurrency = textCurrency?.trim()
    textCurrency = '"' + textCurrency + '"'
    if (!options.noSpace) {
      textCurrency = ' ' + textCurrency
    }
  }

  let showValue = value

  if (options.absolute) {
    showValue = Math.abs(showValue)
  }

  if (options.precise) {
    if (options.precise === 'nice') {
      showValue = niceNumber(showValue, 0, null, 15)
    }
  } else if (options.short) {
    const shortSmallFractionDigits =
      typeof options.shortSmallFractionDigits === 'number' ? options.shortSmallFractionDigits : 2
    const shortLargeFractionDigits =
      typeof options.shortLargeFractionDigits === 'number' ? options.shortLargeFractionDigits : 1
    showValue = shortNiceNumber(showValue, shortSmallFractionDigits, shortLargeFractionDigits)
  } else {
    showValue = niceNumber(showValue, options.minFractionDigits, null, options.maxFractionDigits || 6)
  }

  let showIcon = options?.icon || false

  // do not show icons for native currency
  if (showIcon && originalCurrency === nativeCurrency) {
    showIcon = false
  }

  let tokenImage = ''
  if (showIcon) {
    tokenImage = <TokenImage token={{ issuer, currency: originalCurrency || currency }} />
  }

  if (options.showPlus && value > 0) {
    showValue = '+' + showValue
  }

  const amountText = [showValue, valuePrefix].filter(Boolean).join(' ')

  if (options.tooltip) {
    return (
      <span suppressHydrationWarning>
        {tokenImage}
        <StyleAmount>{amountText} </StyleAmount>
        {options.noCurrency ? null : type === nativeCurrency ? (
          <StyleAmount>{textCurrency}</StyleAmount>
        ) : (
          <span className="tooltip">
            <Link href={'/account/' + issuer}>{textCurrency}</Link>
            <span className={'tooltiptext ' + options.tooltip}>
              {addressUsernameOrServiceLink(amount, 'issuer', { short: true })}
            </span>
          </span>
        )}
      </span>
    )
  } else if (options.withIssuer) {
    return (
      <>
        {tokenImage}
        <StyleAmount>{options.noCurrency ? amountText : `${amountText} ${textCurrency}`}</StyleAmount>
        {issuer ? (
          <span className="no-inherit no-brake">
            (
            {amount.currencyDetails?.type === 'lp_token' ? (
              <LinkAmm ammId={issuer} hash={6} style={{ fontWeight: 400 }} />
            ) : (
              addressUsernameOrServiceLink({ issuer, issuerDetails }, 'issuer', {
                short: options?.issuerShort !== undefined ? options.issuerShort : true
              })
            )}
            )
          </span>
        ) : (
          ''
        )}
      </>
    )
  } else if (options?.icon) {
    // keep options?.icon as showIcon is false for native currency
    return (
      <span className="no-brake">
        {tokenImage}
        <StyleAmount>
          {amountText} {textCurrency}
        </StyleAmount>
      </span>
    )
  } else {
    return amountText + ' ' + textCurrency
  }
}

export const amountFormatNode = (amount, options) => {
  return <span suppressHydrationWarning>{amountFormat(amount, options)}</span>
}

export const lpTokenName = (data) => {
  if (!data) return ''

  let firstCurrency = ''
  let secondCurrency = ''
  if (data.amount) {
    if (data.amount.currency) {
      firstCurrency = niceCurrency(data.amount.currency)
    } else {
      firstCurrency = nativeCurrency
    }
    if (data.amount2.currency) {
      secondCurrency = niceCurrency(data.amount2.currency)
    } else {
      secondCurrency = nativeCurrency
    }
    return firstCurrency + '/' + secondCurrency + ' LP'
  }
}

export const niceCurrency = (currency) => {
  if (!currency) return ''
  if (currency === nativeCurrency) {
    return nativeCurrency
  }
  let firstTwoNumbers = currency.substr(0, 2)
  if (currency.length > 3) {
    if (firstTwoNumbers === '01') {
      // deprecated demurraging/interest-bearing
      let currencyText = Buffer.from(currency.substr(2, 8), 'hex')
      currencyText = currencyText.toString().substr(0, 3)
      let profit = currency.substr(16, 16)
      let valuePrefix = ''
      if (profit === 'C1F76FF6ECB0BAC6' || profit === 'C1F76FF6ECB0CCCD') {
        valuePrefix = '(-0.5%pa)'
      } else if (profit === '41F76FF6ECB0BAC6' || profit === '41F76FF6ECB0CCCD') {
        valuePrefix = '(+0.5%pa)'
      } else if (profit === 'C1E76FF6ECB0BAC6') {
        valuePrefix = '(+1%pa)'
      } else {
        /*
          $realprofit = 1 - (exp(31536000 / hex2double($profit)));
          $realprofit = round($realprofit * 100, 2, PHP_ROUND_HALF_UP);
          if ($realprofit > 0) {
            $plus = '+';
          } else {
            $plus = '';
          }
          $output .= ' (' . $plus . $realprofit . '%pa)';
        */
        valuePrefix = '(??%pa)'
      }
      currency = currencyText + ' ' + valuePrefix
    } else if (firstTwoNumbers === '02') {
      currency = Buffer.from(currency.substring(16), 'hex')
    } else if (firstTwoNumbers === '03') {
      currency = 'LP token'
    } else {
      currency = Buffer.from(currency, 'hex')
    }
  }
  currency = currency.toString('utf8').replace(/\0/g, '') // remove padding nulls
  if (currency.toLowerCase() === nativeCurrency.toLowerCase()) {
    return 'Fake' + nativeCurrency
  }
  return currency
}

export const amountParced = (amount) => {
  if (!amount && amount !== 0) {
    return false
  }

  let currency = ''
  let value = ''
  let valuePrefix = ''
  let type = ''
  let issuer = null
  let issuerDetails = null
  let originalCurrency = '' // Store original currency for token icons

  if (amount.currencyDetails?.type === 'lp_token') {
    originalCurrency = amount.currency
    currency = amount.currencyDetails?.currency
    value = amount.value
    issuer = amount.issuer
    issuerDetails = amount.issuerDetails
    type = 'LPT'
  } else if (amount.value && amount.currency && !(!amount.issuer && amount.currency === nativeCurrency)) {
    originalCurrency = amount.currency // Store original before processing
    currency = amount.currency
    value = amount.value
    issuer = amount.issuer
    issuerDetails = amount.issuerDetails
    type = 'IOU'
    const xls14NftVal = xls14NftValue(value)
    let realXls14 = false

    if (currency.length > 3 && currency.substr(0, 2) === '02' && xls14NftVal) {
      realXls14 = true
    }
    currency = niceCurrency(currency)

    if (xls14NftVal) {
      type = 'NFT'
      if (realXls14) {
        //real xls-14
        valuePrefix = 'NFT (XLS-14)'
      } else {
        //a parody of xls-14
        valuePrefix = 'NFT (XLS-14?)'
      }
      value = xls14NftVal
    }
  } else if (amount.mpt_issuance_id) {
    originalCurrency = amount.mpt_issuance_id
    currency = amount.currencyDetails?.currency || '[MPT: ' + shortHash(amount.mpt_issuance_id, 4) + ']'

    if (currency === nativeCurrency) {
      currency = 'Fake' + nativeCurrency
    }

    value = amount.value
    const scale = amount.currencyDetails?.scale || 0
    if (scale > 0) {
      value = scaleAmount(value, scale)
    }
    issuer = amount.currencyDetails?.account
    issuerDetails = amount.currencyDetails?.accountDetails
    type = 'MPT'
  } else {
    type = nativeCurrency
    originalCurrency = nativeCurrency // Store original before processing
    if (amount.value) {
      value = amount.value
    } else {
      value = amount / 1000000
    }
    currency = nativeCurrency
  }

  if (currency?.toString().toUpperCase() === nativeCurrency && amount.issuer) {
    currency = 'Fake' + nativeCurrency
  }

  // curency + " " - otherwise it is in the hex format
  currency = stripText(currency + ' ')

  return {
    type,
    value,
    valuePrefix,
    currency,
    issuer,
    issuerDetails,
    originalCurrency // Return original currency for token icons
  }
}

export const capitalize = (word) => {
  if (!word) return ''
  return word.charAt(0).toUpperCase() + word.slice(1)
}

export const timeFromNow = (timestamp, i18n, type) => {
  if (timestamp === null || typeof timestamp === 'undefined' || timestamp === '') return ''

  let lang = 'en'
  if (i18n.language === 'default' || i18n.language === 'undefined') {
    lang = 'en'
  } else {
    lang = i18n.language.slice(0, 2)
  }
  dayjs.locale(lang)

  let parsedTime = null

  if (typeof timestamp === 'number') {
    let normalizedTimestamp = timestamp
    if (type === 'ripple') {
      normalizedTimestamp += 946684800 //946684800 is the difference between Unix and Ripple timestamps
    }
    parsedTime = normalizedTimestamp > 1e12 ? dayjs(normalizedTimestamp) : dayjs.unix(normalizedTimestamp)
  } else if (typeof timestamp === 'string') {
    const numericTimestamp = Number(timestamp)
    if (Number.isFinite(numericTimestamp)) {
      let normalizedTimestamp = numericTimestamp
      if (type === 'ripple') {
        normalizedTimestamp += 946684800
      }
      parsedTime = normalizedTimestamp > 1e12 ? dayjs(normalizedTimestamp) : dayjs.unix(normalizedTimestamp)
    } else {
      parsedTime = dayjs(timestamp)
    }
  } else {
    parsedTime = dayjs(timestamp)
  }

  return <span suppressHydrationWarning>{parsedTime?.isValid() ? parsedTime.fromNow() : '-'}</span>
}

export const fullDateAndTime = (timestamp, type = null, options) => {
  //used also in CSV file names as text
  if (!timestamp) return ''

  // if T/Z format
  if (!timestamp.toString().includes('T')) {
    if (type === 'ripple') {
      timestamp += 946684800 //946684800 is the difference between Unix and Ripple timestamps
    }
    timestamp = timestamp * 1000
  }

  let dateAndTime = new Date(timestamp).toLocaleString()
  if (!options?.asText) {
    dateAndTime = <span suppressHydrationWarning>{dateAndTime}</span>
  }

  if (type === 'expiration') {
    return new Date(timestamp) < new Date() ? <span className="orange">{dateAndTime}</span> : dateAndTime
  } else {
    return dateAndTime
  }
}

export const timeFormat = (timestamp, type = null) => {
  if (type === 'ripple') {
    timestamp += 946684800 //946684800 is the difference between Unix and Ripple timestamps
  }
  return (
    <span suppressHydrationWarning>
      {new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
    </span>
  )
}

export const dateFormat = (timestamp, stringParams = {}, params = {}) => {
  if (timestamp) {
    if (params?.type === 'ripple') {
      timestamp += 946684800 //946684800 is the difference between Unix and Ripple timestamps
    }
    if (params.type?.toUpperCase() !== 'ISO') {
      timestamp = timestamp * 1000
    }
    return (
      <span suppressHydrationWarning>
        {stringParams
          ? new Date(timestamp).toLocaleDateString([], stringParams)
          : new Date(timestamp).toLocaleDateString()}
      </span>
    )
  }
  return ''
}

export const timeOrDate = (timestamp, type) => {
  if (type === 'ripple') {
    timestamp += 946684800 //946684800 is the difference between Unix and Ripple timestamps
  }
  //if today - return time, otherwise date
  return new Date(timestamp * 1000).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0)
    ? timeFormat(timestamp)
    : dateFormat(timestamp)
}

export const expirationExpired = (t, timestamp, type) => {
  if (!timestamp.toString().includes('T')) {
    if (type === 'ripple') {
      timestamp += 946684800 //946684800 is the difference between Unix and Ripple timestamps
    }
    timestamp = timestamp * 1000
  }
  return new Date(timestamp) < new Date() ? t('table.expired') : t('table.expiration')
}

export const duration = (t, seconds, options) => {
  if (!seconds) return ''

  const dur = dayjs.duration(seconds, 'seconds')
  const parts = []

  const days = Math.floor(dur.asDays())
  const hours = dur.hours()
  const minutes = dur.minutes()
  const secs = dur.seconds()

  if (days > 0) parts.push(`${days}${t('units.days-short')}`)
  if (hours > 0) parts.push(`${hours}${t('units.hours-short')}`)
  if (minutes > 0) parts.push(`${minutes}${t('units.minutes-short')}`)
  if (options?.seconds && secs > 0) parts.push(`${secs}${t('units.seconds-short')}`)

  return parts.join(' ')
}

//need to make dynamic fraction digits
export const niceNumber = (n, fractionDigits = null, currency = null, maxFractionDigits = null) => {
  if (typeof n === 'string') {
    if (n.includes('x')) {
      //in case of placeholders xxx
      return n
    } else {
      n = Number(n)
    }
  }

  const toSubscript = (value) => {
    const subscriptDigits = {
      0: '₀',
      1: '₁',
      2: '₂',
      3: '₃',
      4: '₄',
      5: '₅',
      6: '₆',
      7: '₇',
      8: '₈',
      9: '₉'
    }

    return String(value)
      .split('')
      .map((digit) => subscriptDigits[digit] || digit)
      .join('')
  }

  const formatTinyBase = (value, significantDigits = 2) => {
    if (!Number.isFinite(value) || value === 0) return '0'

    const abs = Math.abs(value)
    const exponentMatch = abs.toExponential().match(/e-(\d+)$/)
    const leadingZeroes = exponentMatch ? Math.max(Number(exponentMatch[1]) - 1, 0) : 0
    if (leadingZeroes <= 0) return null

    const fixedPrecision = Math.min(Math.max(leadingZeroes + significantDigits + 2, 12), 20)
    const decimalPart = abs.toFixed(fixedPrecision).split('.')[1] || ''
    let significant = decimalPart.slice(leadingZeroes, leadingZeroes + significantDigits)
    significant = significant.replace(/^0+/, '').replace(/0+$/, '')
    if (!significant) significant = '1'

    return `0.0${toSubscript(leadingZeroes)}${significant}`
  }

  const formatTinyCurrency = (value, currencyCode, tinyBase, digits = 2) => {
    try {
      const formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode.toUpperCase(),
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      })

      const parts = formatter.formatToParts(value)
      let inserted = false
      const out = parts
        .map((part) => {
          if (part.type === 'integer') {
            if (!inserted) {
              inserted = true
              return tinyBase
            }
            return ''
          }
          if (part.type === 'fraction' || part.type === 'decimal' || part.type === 'group') {
            return ''
          }
          return part.value
        })
        .join('')

      return out || `${currencyCode.toUpperCase()} ${tinyBase}`
    } catch {
      return `${currencyCode.toUpperCase()} ${tinyBase}`
    }
  }

  if (n || n === 0 || n === '0') {
    const num = Number(n)
    const digits = maxFractionDigits || fractionDigits || 0
    if (Number.isFinite(num) && num !== 0 && digits > 0) {
      const factor = Math.pow(10, digits)
      const roundedDown = Math.floor(Math.abs(num) * factor) / factor
      if (Math.abs(num) < 1 && roundedDown === 0) {
        const tinyBase = formatTinyBase(num, Math.max(digits, 2))
        if (tinyBase) {
          if (currency) {
            return formatTinyCurrency(num, currency, tinyBase, digits)
          }
          return num < 0 ? `-${tinyBase}` : tinyBase
        }
      }
    }

    let options = {
      maximumFractionDigits: maxFractionDigits || fractionDigits || 0,
      minimumFractionDigits: fractionDigits || 0
    }
    if (currency) {
      options.style = 'currency'
      options.currency = currency.toUpperCase()
    }
    if (fractionDigits) {
      const factor = Math.pow(10, fractionDigits)
      n = Math.floor(n * factor) / factor
    }
    return n.toLocaleString(undefined, options)
  } else {
    return n
  }
}

export const fullNiceNumber = (n, currency = null) => {
  if (typeof n === 'string') {
    if (n.includes('x')) {
      //in case of placeholders xxx
      return n
    } else {
      n = Number(n)
    }
  }

  if (n) {
    let options = {
      maximumFractionDigits: 15
    }
    if (currency) {
      options.style = 'currency'
      options.currency = currency.toUpperCase()
    }
    return <span suppressHydrationWarning>{n.toLocaleString(undefined, options)}</span>
  } else {
    return n
  }
}

export const shortNiceNumber = (n, smallNumberFractionDigits = 2, largeNumberFractionDigits = 1, currency = null) => {
  if (n !== 0 && !n) return null
  n = Number(n)
  let beforeNumber = ''
  if (n < 0) {
    beforeNumber = '-'
    n = -1 * n
  }

  if (smallNumberFractionDigits > 2) {
    if (n > 99.99) {
      smallNumberFractionDigits = 2
    } else if (n > 9.99) {
      smallNumberFractionDigits = 3
    }
  }

  const toSubscript = (value) => {
    const subscriptDigits = {
      0: '₀',
      1: '₁',
      2: '₂',
      3: '₃',
      4: '₄',
      5: '₅',
      6: '₆',
      7: '₇',
      8: '₈',
      9: '₉'
    }

    return String(value)
      .split('')
      .map((digit) => subscriptDigits[digit] || digit)
      .join('')
  }

  const formatTinyNumber = (value, significantDigits = 2) => {
    if (!Number.isFinite(value) || value <= 0) return null

    const exponentMatch = value.toExponential().match(/e-(\d+)$/)
    const leadingZeroes = exponentMatch ? Math.max(Number(exponentMatch[1]) - 1, 0) : 0
    if (leadingZeroes <= 0) return null

    const fixedPrecision = Math.min(Math.max(leadingZeroes + significantDigits + 2, 12), 20)
    const decimalPart = value.toFixed(fixedPrecision).split('.')[1] || ''
    let significant = decimalPart.slice(leadingZeroes, leadingZeroes + significantDigits)

    significant = significant.replace(/^0+/, '').replace(/0+$/, '')
    if (!significant) {
      significant = '1'
    }

    return `0.0${toSubscript(leadingZeroes)}${significant}`
  }

  const formatTinyCurrency = (value, currencyCode, significantDigits = 2) => {
    const tinyNumber = formatTinyNumber(value, significantDigits)
    if (!tinyNumber || !currencyCode) return tinyNumber

    try {
      const formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })

      const parts = formatter.formatToParts(0)
      const hasIntegerPart = parts.some((part) => part.type === 'integer')
      if (!hasIntegerPart) {
        return `${currencyCode.toUpperCase()} ${tinyNumber}`
      }

      let numberInserted = false
      const formatted = parts
        .map((part) => {
          if (part.type === 'integer') {
            if (!numberInserted) {
              numberInserted = true
              return tinyNumber
            }
            return ''
          }

          if (part.type === 'fraction' || part.type === 'decimal' || part.type === 'group') {
            return ''
          }

          return part.value
        })
        .join('')

      return formatted || `${currencyCode.toUpperCase()} ${tinyNumber}`
    } catch {
      return `${currencyCode.toUpperCase()} ${tinyNumber}`
    }
  }

  const appendMagnitudeSuffix = (formattedValue, magnitudeSuffix, currencyCode) => {
    if (!formattedValue) return formattedValue

    const code = currencyCode?.toUpperCase?.()
    if (code) {
      const trailingCodeRegex = new RegExp(`\\s*${code}$`)
      if (trailingCodeRegex.test(formattedValue)) {
        return formattedValue.replace(trailingCodeRegex, `${magnitudeSuffix} ${code}`)
      }
    }

    return formattedValue + magnitudeSuffix
  }

  let output = ''
  if (n > 999999999999999) {
    // For numbers > 999 trillion, use scientific notation to avoid huge strings
    output = n.toExponential(2)
  } else if (n > 999999999999) {
    output = appendMagnitudeSuffix(niceNumber(n / 1000000000000, largeNumberFractionDigits, currency), 'T', currency)
  } else if (n > 999999999) {
    output = appendMagnitudeSuffix(niceNumber(n / 1000000000, largeNumberFractionDigits, currency), 'B', currency)
  } else if (n > 999999) {
    output = appendMagnitudeSuffix(niceNumber(n / 1000000, largeNumberFractionDigits, currency), 'M', currency)
  } else if (n > 9999) {
    output = appendMagnitudeSuffix(niceNumber(n / 1000, largeNumberFractionDigits, currency), 'K', currency)
  } else if (n > 999) {
    output = niceNumber(Math.floor(n), 0, currency)
  } else if (n === 0) {
    output = niceNumber(0, 0, currency)
  } else {
    const pow = Math.pow(10, smallNumberFractionDigits)
    const roundedDownValue = Math.floor(n * pow) / pow
    const shouldUseTinyFormat = n < 1 && roundedDownValue === 0

    if (shouldUseTinyFormat) {
      output = currency
        ? formatTinyCurrency(n, currency, Math.max(smallNumberFractionDigits, 2))
        : formatTinyNumber(n, Math.max(smallNumberFractionDigits, 2))
    } else {
      output = niceNumber(roundedDownValue, smallNumberFractionDigits, currency)
    }
  }
  return beforeNumber + output
}

// percent delta formatted like +49K% / -3.2%
// uses existing shortNiceNumber()
export const shortNicePercent = (p, smallDigits = 1, largeDigits = 1) => {
  if (p === null || p === undefined) return ''
  const n = Number(p)
  if (!Number.isFinite(n)) return ''

  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  const abs = Math.abs(n)

  // shortNiceNumber returns string without sign for positive numbers, so we add sign ourselves
  return `${sign}${shortNiceNumber(abs, smallDigits, largeDigits) ?? '0'}%`
}

const syntaxHighlight = (json) => {
  if (!json) return ''
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    function (match) {
      var cls = 'number'
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'key'
        } else {
          cls = 'string'
        }
      } else if (/true|false/.test(match)) {
        cls = 'boolean'
      } else if (/null/.test(match)) {
        cls = 'null'
      }
      return '<span class="' + cls + '">' + match + '</span>'
    }
  )
}

export const codeHighlight = (json) => {
  if (typeof json === 'string') {
    json = JSON.parse(json)
  }
  return (
    <pre
      dangerouslySetInnerHTML={{
        __html: syntaxHighlight(JSON.stringify(json, undefined, 4))
      }}
    />
  )
}

export const decodeJsonMemo = (memopiece, options) => {
  if (options?.code === 'base64') {
    try {
      memopiece = atob(memopiece)
    } catch (e) {
      return memopiece
    }
  }
  if (memopiece[0] === '{') {
    try {
      memopiece = JSON.parse(memopiece)
    } catch (e) {
      return memopiece
    }
    return codeHighlight(memopiece)
  }
  return ''
}

export const showAmmPercents = (x) => {
  x = x ? x / 1000 : '0'
  return x + '%'
}

export const showFlags = (flags) => {
  if (!flags || Object.keys(flags).length === 0) return null
  const trueFlags = Object.entries(flags).filter(([, flagValue]) => flagValue === true)
  if (!trueFlags?.length) return null
  return (
    <div className="flag-list">
      {trueFlags.map(([flag]) => (
        <span key={flag} className="flag">
          {flag}
        </span>
      ))}
    </div>
  )
}
