import { Buffer } from 'buffer'
import Link from 'next/link'
import React from 'react'
import { Trans } from 'next-i18next'
import moment from 'moment'
import momentDurationFormatSetup from 'moment-duration-format'

import LinkIcon from '../public/images/link.svg'
import {
  stripText,
  nativeCurrency,
  nativeCurrenciesImages,
  avatarServer,
  devNet,
  isAmountInNativeCurrency,
  xls14NftValue
} from '.'
import { mpUrl } from './nft'
import Image from 'next/image'
import CopyButton from '../components/UI/CopyButton'

momentDurationFormatSetup(moment)

export const AddressWithIcon = ({ children, address }) => {
  let imageUrl = avatarServer + address
  if (!address) {
    imageUrl = nativeCurrenciesImages[nativeCurrency]
  }
  return (
    <table style={{ minWidth: 126 }}>
      <tbody>
        <tr className="no-border">
          <td style={{ padding: 0, width: 35, height: 35 }}>
            <Image alt="avatar" src={imageUrl} width="35" height="35" style={{ verticalAlign: 'middle' }} />
          </td>
          <td style={{ padding: '0 0 0 5px' }}>{children}</td>
        </tr>
      </tbody>
    </table>
  )
}

export const AddressWithIconFilled = ({ data, name, copyButton }) => {
  if (!data) return ''
  if (!name) {
    name = 'address'
  }
  return (
    <AddressWithIcon address={data[name]}>
      {userOrServiceLink(data, name) && (
        <>
          {userOrServiceLink(data, name)}
          <br />
        </>
      )}
      {addressLink(data[name])} {copyButton && <CopyButton text={data[name]} />}
    </AddressWithIcon>
  )
}

export const nativeCurrencyToFiat = (params) => {
  if (devNet) return ''
  const { amount, selectedCurrency, fiatRate } = params
  if (!amount || !selectedCurrency || !fiatRate || !isAmountInNativeCurrency(amount)) return ''

  let calculatedAmount = null

  if (amount.currency === nativeCurrency) {
    calculatedAmount = shortNiceNumber(amount.value * fiatRate, 2, 1, selectedCurrency)
  } else {
    calculatedAmount = shortNiceNumber((amount / 1000000) * fiatRate, 2, 1, selectedCurrency)
  }

  return (
    <span className="tooltip">
      {' '}
      ≈ {calculatedAmount}
      <span className="tooltiptext no-brake">
        1 {nativeCurrency} = {shortNiceNumber(fiatRate, 2, 1, selectedCurrency)}
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

export const txIdLink = (txId, chars = 10) => {
  if (!txId) return ''
  return (
    <a href={'/explorer/' + txId} aria-label="Transaction link">
      {!chars ? <LinkIcon /> : shortHash(txId, chars)}
    </a>
  )
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
  if (data[type + 'Details']) {
    const { username, service } = data[type + 'Details']
    let link = username ? username : data[type]
    if (service) {
      let serviceName = service
      if (options.short && serviceName.length > 18) {
        serviceName = service.substring(0, 15).trim() + '...'
      }
      if (options.url === '/explorer/') {
        return (
          <a href={options.url + link} className="bold green">
            {serviceName}
          </a>
        )
      } else {
        return (
          <Link href={options.url + link} className="bold green">
            {serviceName}
          </Link>
        )
      }
    }
    if (username) {
      if (options.url === '/explorer/') {
        return (
          <a href={options.url + link} className="bold blue">
            {username}
          </a>
        )
      } else {
        return (
          <Link href={options.url + link} className="bold blue">
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
      return oldExplorerLink(data[type], { short: options.short })
    } else {
      return <Link href={options.url + data[type]}>{shortAddress(data[type])}</Link>
    }
  }
  if (options.url === '/explorer/') {
    return oldExplorerLink(data[type])
  } else {
    return <Link href={options.url + data[type]}>{data[type]}</Link>
  }
}

export const addressLink = (address, options = {}) => {
  if (!address) return ''
  return (
    <Link href={'/account/' + address} aria-label="address link">
      {options.short ? shortAddress(address, options.short) : address}
    </Link>
  )
}

export const userOrServiceName = (data) => {
  if (data) {
    const { service, username } = data
    if (service) {
      return <b className="green">{service}</b>
    }
    if (username) {
      return <b className="blue">{username}</b>
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

export const trAmountWithGateway = ({ amount, name }) => {
  if (!amount && amount !== 0) return ''
  return (
    <tr>
      <td>{name}</td>
      <td>
        {amountFormatNode(amount)}
        {amount?.issuer && <> ({addressUsernameOrServiceLink(amount, 'issuer', { short: true })})</>}
        {amount?.counterparty && <> ({addressUsernameOrServiceLink(amount, 'counterparty', { short: true })})</>}
      </td>
    </tr>
  )
}

export const amountFormat = (amount, options = {}) => {
  if (!amount && amount !== '0' && amount !== 0) {
    return ''
  }
  const { value, currency, valuePrefix, issuer, type } = amountParced(amount)

  if (options.precise) {
    if (options.precise === 'nice') {
      return niceNumber(value, 0, null, 15) + ' ' + valuePrefix + ' ' + currency
    }
    return value + ' ' + valuePrefix + ' ' + currency
  }

  let showValue = value

  if (Math.abs(value) >= 100) {
    if (options.short) {
      showValue = shortNiceNumber(value, 0, 1)
    } else {
      if (options.minFractionDigits) {
        showValue = niceNumber(value, options.minFractionDigits)
      } else {
        showValue = niceNumber(value)
      }
    }
  } else if (options.maxFractionDigits) {
    showValue = niceNumber(value, 0, null, options.maxFractionDigits)
  }

  //add issued by (issuerDetails.service / username)
  if (type !== nativeCurrency && options.tooltip) {
    return (
      <span suppressHydrationWarning>
        {showValue} {valuePrefix}{' '}
        <span className="tooltip">
          <Link href={'/account/' + issuer}>{currency}</Link>
          <span className={'tooltiptext ' + options.tooltip}>
            {addressUsernameOrServiceLink(amount, 'issuer', { short: true })}
          </span>
        </span>
      </span>
    )
  } else {
    //type: ['IOU', 'IOU demurraging', 'NFT']
    let textCurrency = currency
    if (options.noSpace) {
      textCurrency = textCurrency?.trim()
    }
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
    return 'LP ' + firstCurrency + '/' + secondCurrency
  }
}

export const niceCurrency = (currency) => {
  if (!currency) return ''
  let firstTwoNumbers = currency.substr(0, 2)
  if (currency.length > 3) {
    if (firstTwoNumbers === '01') {
      // deprecated demurraging/interest-bearing
      type = 'IOU demurraging'
      let currencyText = Buffer.from(currency.substr(2, 8), 'hex')
      currencyText = currencyText.substr(0, 3)
      let profit = currency.substr(16, 16)
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
      currency = currencyText
    } else if (firstTwoNumbers === '02') {
      currency = Buffer.from(currency.substring(16), 'hex')
    } else if (firstTwoNumbers === '03') {
      currency = 'LP token'
    } else {
      currency = Buffer.from(currency, 'hex')
    }
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

  if (amount.value && !(!amount.issuer && amount.currency === nativeCurrency)) {
    currency = amount.currency
    value = amount.value
    issuer = amount.issuer
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
  } else {
    type = nativeCurrency
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
    issuer
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
  moment.locale(lang)

  if (type === 'ripple') {
    timestamp += 946684800 //946684800 is the difference between Unix and Ripple timestamps
  }

  return <span suppressHydrationWarning>{moment(timestamp * 1000, 'unix').fromNow()}</span>
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

export const timeFormat = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export const dateFormat = (timestamp, stringParams = {}, params = {}) => {
  if (timestamp) {
    if (params.type?.toUpperCase() !== 'ISO') {
      timestamp = timestamp * 1000
    }
    if (stringParams) {
      return new Date(timestamp).toLocaleDateString([], stringParams)
    } else {
      return new Date(timestamp).toLocaleDateString()
    }
  }
  return ''
}

export const timeOrDate = (timestamp) => {
  //if today - return time, otherwise date
  return new Date(timestamp * 1000).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0)
    ? timeFormat(timestamp)
    : dateFormat(timestamp)
}

export const expirationExpired = (t, timestamp) => {
  return new Date(timestamp * 1000) < new Date() ? t('table.expired') : t('table.expiration')
}

export const duration = (t, seconds, options) => {
  /*
    years:   Y or y
    months:  M
    weeks:   W or w
    days:    D or d
    hours:   H or h
    minutes: m
    seconds: s
    ms:      S
  */
  if (!seconds) return ''
  return moment
    .duration(seconds, 'seconds')
    .format(
      'd[' +
        t('units.days-short') +
        '] h[' +
        t('units.hours-short') +
        '] m[' +
        t('units.minutes-short') +
        ']' +
        (options?.seconds ? ' s[' + t('units.seconds-short') + ']' : ''),
      { trim: 'both' }
    )
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

export const shortNiceNumber = (n, smallNumberFractionDigits = 2, largeNumberFractionDigits = 3, currency = null) => {
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
    //} else if (n > 99999) {
    //output = niceNumber(Math.floor(n), 0, currency)
  } else if (n > 9999) {
    output = niceNumber(n / 1000, largeNumberFractionDigits, currency) + 'K'
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

export const showAmmPercents = (x) => {
  x = x ? x / 1000 : '0'
  return x + '%'
}
