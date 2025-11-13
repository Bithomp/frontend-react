import { Buffer } from 'buffer'
import dayjs from 'dayjs'
import * as durationPlugin from 'dayjs/plugin/duration'
import * as relativeTimePlugin from 'dayjs/plugin/relativeTime'
import Image from 'next/image'
import Link from 'next/link'
import { Trans } from 'next-i18next'

import CopyButton from '../components/UI/CopyButton'
import LinkIcon from '../public/images/link.svg'
import { mpUrl } from './nft'
import {
  avatarServer,
  devNet,
  isAmountInNativeCurrency,
  nativeCurrency,
  nativeCurrenciesImages,
  stripText,
  xls14NftValue,
  tokenImageSrc,
  mptokenImageSrc,
  shortName
} from '.'
import { scaleAmount } from './calc'
import { LinkAmm } from './links'

dayjs.extend(durationPlugin)
dayjs.extend(relativeTimePlugin)

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

const TokenImage = ({ token }) => {
  return (
    <Image
      src={tokenImageSrc(token)}
      alt="token"
      height={16}
      width={16}
      style={{
        verticalAlign: 'text-bottom',
        display: 'inline-block',
        borderRadius: '50%',
        marginBottom: -1,
        marginRight: 5,
        backgroundColor: '#fff',
        boxShadow: '0 0 0 1px #fff' // subtle stroke to separate edges
      }}
    />
  )
}

export const CurrencyWithIcon = ({ token }) => {
  if (!token) return ''
  const { lp_token, currencyDetails } = token

  return (
    <>
      <TokenImage token={token} />
      {lp_token ? currencyDetails?.currency : niceCurrency(token.currency)}
    </>
  )
}

export const AddressWithIconInline = ({ data, name = 'address', options }) => {
  const address = data[name]
  const size = 20
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
            marginRight: 4,
            marginBottom: -5,
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'inline-block'
          }}
        >
          <img
            src={avatarServer + address || placeholder}
            alt={data?.[name?.toLowerCase() + 'Details']?.service || 'service logo'}
            height={size}
            width={size}
            style={{
              objectFit: 'cover',
              transform: !data?.[name?.toLowerCase() + 'Details']?.service ? 'scale(1.14)' : 'scale(1)'
            }}
            onError={(e) => {
              e.target.onerror = null
              e.target.src = placeholder
            }}
          />
        </div>
      </Link>
      {addressUsernameOrServiceLink(data, name, options)}
    </span>
  )
}

export const AddressWithIcon = ({ children, address, currency, options }) => {
  let imageUrl = avatarServer + address

  if (currency) {
    if (options?.mptId) {
      imageUrl = mptokenImageSrc(options.mptId)
    } else {
      imageUrl = tokenImageSrc({ issuer: address, currency })
    }
  }

  if (!address) {
    imageUrl = nativeCurrenciesImages[nativeCurrency]
  }

  let doubleIcon = false
  let assetImageUrl, asset2ImageUrl

  // LP token - show 2 icons
  if (options?.currencyDetails?.asset && options?.currencyDetails?.asset2) {
    doubleIcon = true
    assetImageUrl = tokenImageSrc(options.currencyDetails.asset)
    asset2ImageUrl = tokenImageSrc(options.currencyDetails.asset2)
  }

  return (
    <table style={{ minWidth: 126 }}>
      <tbody>
        <tr className="no-border">
          <td style={{ padding: 0, width: 35, height: 35 }}>
            {doubleIcon ? (
              <div style={{ position: 'relative', width: 35, height: 35, verticalAlign: 'middle' }}>
                {/* back coin */}
                <Image
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
                    boxShadow: '0 0 0 1px #fff' // subtle stroke to separate edges
                  }}
                />
                {/* front coin */}
                <Image
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
                    boxShadow: '0 0 0 1px #fff'
                  }}
                />
              </div>
            ) : (
              <Image alt="avatar" src={imageUrl} width="35" height="35" style={{ verticalAlign: 'middle' }} />
            )}
          </td>
          <td style={{ padding: '0 0 0 5px' }}>{children}</td>
        </tr>
      </tbody>
    </table>
  )
}

export const AddressWithIconFilled = ({ data, name, copyButton, options, currency }) => {
  if (!data) return ''
  if (!name) {
    name = 'address'
  }

  const fullUrl = currency && !options?.mptId ? '/token/' + data[name] + '/' + currency : null
  const link = userOrServiceLink(data, name, { fullUrl })

  const ammId = options?.currencyDetails?.ammID
  const lpToken = options?.currencyDetails?.type === 'lp_token'

  const textCurrency = options?.mptId
    ? currency
    : lpToken && options?.currencyDetails?.currency
    ? options.currencyDetails.currency
    : niceCurrency(currency)

  return (
    <AddressWithIcon address={data[name]} currency={currency} options={options}>
      {currency && (
        <>
          <span className="bold">{textCurrency}</span>{' '}
        </>
      )}
      {options?.currencyName &&
        options.currencyName.length > 10 &&
        currency.length > 10 &&
        options.currencyName !== currency && <br />}
      {options?.currencyName && options.currencyName !== currency && (
        <span>{shortName(options.currencyName, { maxLength: 10 })}</span>
      )}{' '}
      {link}
      {(currency || options?.currencyName || link) && <br />}
      {ammId ? (
        <>
          AMM pool: <LinkAmm ammId={ammId} hash={!options?.short} icon={options?.short} />
        </>
      ) : (
        <>{options?.flags ? showFlags(options.flags) : addressLink(data[name], { ...options, fullUrl })}</>
      )}{' '}
      {copyButton && <CopyButton text={data[name]} />}
    </AddressWithIcon>
  )
}

export const nativeCurrencyToFiat = (params) => {
  if (!isAmountInNativeCurrency(params?.amount)) return ''
  return amountToFiat(params)
}

export const amountToFiat = (params) => {
  if (devNet) return ''
  const { amount, selectedCurrency, fiatRate } = params
  if (!amount || amount === '0' || !selectedCurrency || !fiatRate) return ''

  let currency = ''
  let initialAmount
  let calculatedAmount

  if (!amount?.currency) {
    // drops
    initialAmount = amount / 1000000
    currency = nativeCurrency
  } else {
    initialAmount = amount.value
    currency = niceCurrency(amount.currency)
  }

  const absolute = Math.abs(initialAmount)

  if (params.absolute) {
    initialAmount = absolute
  }

  if (absolute > 1) {
    calculatedAmount = shortNiceNumber(initialAmount * fiatRate, 2, 1, selectedCurrency)
  } else {
    calculatedAmount = niceNumber(initialAmount * fiatRate, null, selectedCurrency, 6)
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
        1 {currency} = {shortNiceNumber(fiatRate, 2, 1, selectedCurrency)}
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

  let link = '/explorer/'
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
    if (link === '/explorer/') {
      return <a href={link + (nft[type + 'Details'].username || nft[type])}>{showName ? showName : defaultContent}</a>
    } else {
      return (
        <Link href={link + (nft[type + 'Details'].username || nft[type])}>{showName ? showName : defaultContent}</Link>
      )
    }
  }
  if (link === '/explorer/') {
    return <a href={link + nft[type]}>{defaultContent}</a>
  } else {
    return <Link href={link + nft[type]}>{defaultContent}</Link>
  }
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

    let buildLink = options?.fullUrl || options?.url + link
    if (service) {
      let serviceName = service
      if (options.short && serviceName.length > 18) {
        serviceName = service.substring(0, 15).trim() + '...'
      }
      if (options.url === '/explorer/') {
        return (
          <a href={buildLink} className="bold green">
            {serviceName}
          </a>
        )
      } else {
        return (
          <Link href={buildLink} className="bold green">
            {serviceName}
          </Link>
        )
      }
    }
    if (username) {
      if (options.url === '/explorer/') {
        return (
          <a href={buildLink} className="bold blue">
            {username}
          </a>
        )
      } else {
        return (
          <Link href={buildLink} className="bold blue">
            {username}
          </Link>
        )
      }
    }
  }
  return ''
}

const oldExplorerLink = (address, options = {}) => {
  if (!address) return ''
  return (
    <a href={'/explorer/' + address} aria-label="address link">
      {options.short ? shortAddress(address, options.short) : address}
    </a>
  )
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
    if (options.url === '/explorer/') {
      return oldExplorerLink(data?.[type], { short: options.short })
    } else {
      return <Link href={options.url + data?.[type]}>{shortAddress(data?.[type], options.short)}</Link>
    }
  }
  if (options.url === '/explorer/') {
    return oldExplorerLink(data[type])
  } else {
    return <Link href={options.url + data?.[type]}>{data?.[type]}</Link>
  }
}

export const addressLink = (address, options = {}) => {
  if (!address) return ''
  return (
    <Link href={options?.fullUrl || '/account/' + address} aria-label="address link">
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

export const trAmountWithGateway = ({ amount, name, icon }) => {
  if (!amount && amount !== 0) return ''
  return (
    <tr>
      <td>{name}</td>
      <td>
        {amountFormatNode(amount)}
        {icon ? (
          <>
            {amount?.issuer && <AddressWithIconInline data={amount} name="issuer" options={{ short: true }} />}
            {amount?.counterparty && (
              <AddressWithIconInline data={amount} name="counterparty" options={{ short: true }} />
            )}
          </>
        ) : (
          <>
            {amount?.issuer && <> ({addressUsernameOrServiceLink(amount, 'issuer', { short: true })})</>}
            {amount?.counterparty && <> ({addressUsernameOrServiceLink(amount, 'counterparty', { short: true })})</>}
          </>
        )}
      </td>
    </tr>
  )
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
  } else {
    if (Math.abs(showValue) >= 100) {
      if (options.short) {
        showValue = shortNiceNumber(showValue, 0, 1)
      } else {
        if (options.minFractionDigits) {
          showValue = niceNumber(showValue, options.minFractionDigits)
        } else {
          showValue = niceNumber(showValue)
        }
      }
    } else if (options.maxFractionDigits) {
      showValue = niceNumber(showValue, 0, null, options.maxFractionDigits)
    }
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

  if (options.tooltip) {
    return (
      <span suppressHydrationWarning>
        {tokenImage}
        <StyleAmount>
          {showValue} {valuePrefix}{' '}
        </StyleAmount>
        {type === nativeCurrency ? (
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
        <StyleAmount>
          {showValue} {valuePrefix} {textCurrency}
        </StyleAmount>
        {issuer ? (
          <span className="no-inherit">
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
        <StyleAmount>{showValue + ' ' + valuePrefix + ' ' + textCurrency}</StyleAmount>
      </span>
    )
  } else {
    return showValue + ' ' + valuePrefix + ' ' + textCurrency
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
  return currency.toString('utf8').replace(/\0/g, '') // remove padding nulls
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
  let lang = 'en'
  if (i18n.language === 'default' || i18n.language === 'undefined') {
    lang = 'en'
  } else {
    lang = i18n.language.slice(0, 2)
  }
  dayjs.locale(lang)

  if (type === 'ripple') {
    timestamp += 946684800 //946684800 is the difference between Unix and Ripple timestamps
  }

  return <span suppressHydrationWarning>{dayjs(timestamp * 1000, 'unix').fromNow()}</span>
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
export const niceNumber = (n, fractionDigits = 0, currency = null, maxFractionDigits = 0) => {
  if (typeof n === 'string') {
    if (n.includes('x')) {
      //in case of placeholders xxx
      return n
    } else {
      n = Number(n)
    }
  }
  if (n || n === 0 || n === '0') {
    let options = {
      maximumFractionDigits: maxFractionDigits || fractionDigits,
      minimumFractionDigits: fractionDigits
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
  let output = ''
  if (n > 999999999999) {
    output = niceNumber(n / 1000000000000, largeNumberFractionDigits, currency) + 'T'
  } else if (n > 999999999) {
    output = niceNumber(n / 1000000000, largeNumberFractionDigits, currency) + 'B'
  } else if (n > 999999) {
    output = niceNumber(n / 1000000, largeNumberFractionDigits, currency) + 'M'
  } else if (n > 9999) {
    output = niceNumber(n / 1000, largeNumberFractionDigits, currency) + 'K'
  } else if (n > 999) {
    output = niceNumber(Math.floor(n), 0, currency)
  } else if (n === 0) {
    output = niceNumber(0, 0, currency)
  } else {
    const pow = Math.pow(10, smallNumberFractionDigits)
    output = niceNumber(Math.floor(n * pow) / pow, smallNumberFractionDigits, currency)
  }
  return beforeNumber + output
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
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(flags)
        .filter(([, flagValue]) => flagValue === true)
        .map(([flag]) => (
          <span key={flag} className="flag">
            {flag}
          </span>
        ))}
    </div>
  )
}
