import { useCallback, useEffect, useState } from 'react'
import { Buffer } from 'buffer'
import { decodeAccountID, isValidClassicAddress } from 'ripple-address-codec'
import countries from 'i18n-iso-countries'
import Cookies from 'universal-cookie'

export const cookieParams = { path: '/', maxAge: 31536000 }

export const useCookie = (key, defaultValue) => {
  const cookies = new Cookies()

  const [item, setItemValue] = useState(() => {
    if (cookies.get(key) !== undefined && cookies.get(key) !== 'undefined' && cookies.get(key) !== '') {
      return cookies.get(key)
    }
    if (defaultValue !== undefined) {
      cookies.set(key, defaultValue, cookieParams)
    }
    return defaultValue
  })

  const setValue = (value) => {
    if (value !== undefined && value !== 'undefined' && value !== '') {
      setItemValue(value)
      cookies.set(key, value, cookieParams)
    } else {
      cookies.remove(key)
      setItemValue('')
    }
  }

  const removeItem = () => {
    cookies.remove(key)
    setItemValue('')
  }

  return [item, setValue, removeItem]
}

export const timestampExpired = (timestamp, type) => {
  if (!timestamp) return null
  // if T/Z format
  if (!timestamp.toString().includes('T')) {
    if (type === 'ripple') {
      timestamp += 946684800 //946684800 is the difference between Unix and Ripple timestamps
    }
    timestamp = timestamp * 1000
  }
  return new Date(timestamp) < new Date()
}

export const turnstileSupportedLanguages = [
  'ar-EG',
  'de',
  'en',
  'es',
  'fa',
  'fr',
  'id',
  'it',
  'ja',
  'ko',
  'nl',
  'pl',
  'pt-BR',
  'ru',
  'tr',
  'zh-CN',
  'zh-TW'
]

export const periodDescription = (periodName) => {
  if (periodName?.includes('..')) {
    const periodParts = periodName.split('..')
    return 'from ' + new Date(periodParts[0]).toLocaleString() + ' to ' + new Date(periodParts[1]).toLocaleString()
  } else {
    return periodName
  }
}

export const countriesTranslated = (language) => {
  let lang = language.slice(0, 2)
  if (language === 'default') {
    lang = 'en'
  }
  const notSupportedLanguages = ['my'] // supported "en", "ru", "ja", "ko", "fr" etc
  if (notSupportedLanguages.includes(lang)) {
    lang = 'en'
  }
  const languageData = require('i18n-iso-countries/langs/' + lang + '.json')
  countries.registerLocale(languageData)
  countries.getNameTranslated = (code) => {
    return countries.getName(code, lang, { select: 'official' })
  }

  countries.getNamesTranslated = () => {
    return countries.getNames(lang, { select: 'official' })
  }

  const countryObj = countries.getNamesTranslated()
  const countryArr = Object.entries(countryObj).map(([key, value]) => {
    return {
      label: value,
      value: key
    }
  })
  countryArr.sort((a, b) => a.label.localeCompare(b.label, lang))
  countries.countryArr = countryArr

  return countries
}

export const chartSpan = (period) => {
  if (!period) return ''

  if (period === 'hour') {
    return 'minute'
  } else if (period === 'day') {
    return 'hour'
  } else if (period === 'week') {
    return 'day'
  } else if (period === 'month') {
    return 'day'
  } else if (period === 'year') {
    return 'month'
  } else if (period === 'all') {
    return 'year'
  }

  if (period?.includes('..')) {
    const periodParts = period.split('..')
    const startDate = new Date(periodParts[0])
    const endDate = new Date(periodParts[1])
    const oneHour = 60 * 60 * 1000
    const oneDay = 24 * oneHour
    const oneMonth = 30 * oneDay
    if (endDate - startDate <= oneHour) {
      return 'minute'
    } else if (endDate - startDate <= 60 * oneHour) {
      return 'hour'
    } else if (endDate - startDate <= 60 * oneDay) {
      return 'day'
    }
    if (endDate - startDate <= 60 * oneMonth) {
      return 'month'
    } else {
      ;('year')
    }
  }
}

export const delay = async (milliseconds, callback, options) => {
  const delayFunction = () => {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds)
    })
  }
  await delayFunction()
  callback(options)
}

//https://github.com/XRPLF/CTID/blob/main/ctid.js#L24C31-L24C31 by Richard
export const decodeCTID = (ctid) => {
  let ctidValue
  if (typeof ctid === 'string') {
    if (!/^[0-9A-F]+$/.test(ctid)) throw new Error('ctid must be a hexadecimal string or BigInt')

    if (ctid.length !== 16) throw new Error('ctid must be exactly 16 nibbles and start with a C')

    ctidValue = BigInt('0x' + ctid)
  } else if (typeof ctid === 'bigint') ctidValue = ctid
  else throw new Error('ctid must be a hexadecimal string or BigInt')

  if (ctidValue > 0xffffffffffffffffn || (ctidValue & 0xf000000000000000n) != 0xc000000000000000n)
    throw new Error('ctid must be exactly 16 nibbles and start with a C')

  const ledgerIndex = Number((ctidValue >> 32n) & 0xfffffffn)
  const txIndex = Number((ctidValue >> 16n) & 0xffffn)
  const networkId = Number(ctidValue & 0xffffn)
  return {
    networkId,
    ledgerIndex,
    txIndex
  }
}

export const fiatCurrencyList = [
  { value: 'usd', label: 'USD' },
  { value: 'eur', label: 'EUR' },
  { value: 'jpy', label: 'JPY' },
  { value: 'gbp', label: 'GBP' },
  { value: 'aud', label: 'AUD' },
  { value: 'cad', label: 'CAD' },
  { value: 'chf', label: 'CHF' },
  { value: 'cny', label: 'CNY' },
  { value: 'hkd', label: 'HKD' },
  { value: 'nzd', label: 'NZD' },
  { value: 'sek', label: 'SEK' },
  { value: 'krw', label: 'KRW' },
  { value: 'sgd', label: 'SGD' },
  { value: 'nok', label: 'NOK' },
  { value: 'mxn', label: 'MXN' },
  { value: 'inr', label: 'INR' },
  { value: 'rub', label: 'RUB' },
  { value: 'zar', label: 'ZAR' },
  { value: 'try', label: 'TRY' },
  { value: 'brl', label: 'BRL' },
  { value: 'twd', label: 'TWD' },
  { value: 'dkk', label: 'DKK' },
  { value: 'pln', label: 'PLN' },
  { value: 'thb', label: 'THB' },
  { value: 'idr', label: 'IDR' },
  { value: 'huf', label: 'HUF' },
  { value: 'czk', label: 'CZK' },
  { value: 'ils', label: 'ILS' },
  { value: 'clp', label: 'CLP' },
  { value: 'php', label: 'PHP' },
  { value: 'aed', label: 'AED' },
  { value: 'sar', label: 'SAR' },
  { value: 'myr', label: 'MYR' },
  { value: 'ars', label: 'ARS' },
  { value: 'bdt', label: 'BDT' },
  { value: 'bhd', label: 'BHD' },
  { value: 'kwd', label: 'KWD' },
  { value: 'ngn', label: 'NGN' },
  { value: 'uah', label: 'UAH' },
  { value: 'vnd', label: 'VND' }
]

export const useWidth = () => {
  const [width, setWidth] = useState(0)
  const handleResize = () => setWidth(window.innerWidth)
  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return width
}

export const useLocalStorage = (key, initialValue) => {
  const initialize = (key) => {
    try {
      const item = localStorage.getItem(key)
      if (item && item !== 'undefined') {
        return JSON.parse(item)
      }

      if (typeof initialValue !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(initialValue))
        return initialValue
      } else {
        return null
      }
    } catch {
      if (typeof initialValue !== 'undefined') {
        return initialValue
      } else {
        return null
      }
    }
  }

  const [state, setState] = useState(null)

  useEffect(() => {
    setState(initialize(key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        setState(valueToStore)
        localStorage.setItem(key, JSON.stringify(valueToStore))
      } catch (error) {
        console.log(error)
      }
    },
    [key, setState]
  )

  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key)
    } catch {
      console.log(error)
    }
  }, [key])

  return [state, setValue, remove]
}

const shallRemoveParam = (tabList, tab, defaultTab, setTab) => {
  if (!setTab) return false
  const existTab = tabList.some((t) => t.value === tab)
  if (!existTab) {
    setTab(defaultTab)
    return true
  } else {
    return tab === defaultTab
  }
}

export const setTabParams = (router, tabs, addList = [], removeList = []) => {
  for (let i = 0; i < tabs.length; i++) {
    const { tabList, tab, defaultTab, setTab, paramName } = tabs[i]
    if (shallRemoveParam(tabList, tab, defaultTab, setTab)) {
      removeList.push(paramName)
    } else {
      addList.push({
        name: paramName,
        value: tab
      })
    }
  }
  addAndRemoveQueryParams(router, addList, removeList)
}

export const removeQueryParams = (router, removeList) => {
  const { query, pathname } = router
  let params = new URLSearchParams(query)
  for (let i = 0; i < removeList.length; i++) {
    params.delete(removeList[i])
  }
  router.replace({ pathname, query: params.toString() }, null, { shallow: true })
}

export const addQueryParams = (router, addList = []) => {
  if (!addList.length) return
  for (let i = 0; i < addList.length; i++) {
    const { name, value } = addList[i]
    router.query[name] = value
  }
  const { query, pathname } = router
  router.replace({ pathname, query }, null, { shallow: true })
}

export const addAndRemoveQueryParams = (router, addList, removeList) => {
  for (let i = 0; i < addList.length; i++) {
    const { name, value } = addList[i]
    router.query[name] = value
  }
  removeQueryParams(router, removeList)
}

export const stripText = (text) => {
  if (!text) return ''
  text = text.toString() //For buffer/hex
  return text
}

export const typeNumberOnly = (e) => {
  //do not allow dot or comma to be first
  if (e.target.selectionStart === 0 && (e.key === ',' || e.key === '.')) {
    e.preventDefault()
    return
  }
  if (e.key === ',' || e.key === '.') {
    e.preventDefault()
    if (e.target.value.indexOf('.') !== -1) {
      return
    } else {
      e.target.value += '.'
      return
    }
  }
  const pattern = /^[,.0-9]+$/
  if (!pattern.test(e.key)) {
    e.preventDefault()
    return
  }
  if (e.key === '.' && e.target.value.indexOf('.') !== -1) {
    e.preventDefault()
    return
  }
  //maximum 6 digits after the dot
  //maximum 10 digits after the dot
  if (e.target.value.indexOf('.') !== -1) {
    if (e.target.value.length > 12) {
      e.preventDefault()
      return
    }
    const splitedByDot = e.target.value.split('.')
    if (splitedByDot[0].length > 9 || splitedByDot[1].length > 5) {
      e.preventDefault()
      return
    }
  } else if (e.target.value.length > 9) {
    e.preventDefault()
    return
  }
}

export const decode = (code) => {
  if (!code) return null
  const decodedHex = Buffer.from(code, 'hex')
  const decodedString = decodedHex.toString()
  if (!decodedString.includes('�')) return stripText(decodedString)
  return stripText(code)
}

export const encode = (code) => {
  return Buffer.from(code).toString('hex').toUpperCase()
}

export const nativeCurrenciesImages = {
  XRP: '/images/currencies/xrp.svg',
  XAH: '/images/currencies/xah.png'
}

export const network = process.env.NEXT_PUBLIC_NETWORK_NAME
const webAddress = process.env.NEXT_PUBLIC_WEB_ADDRESS
export const devNet = ['mainnet', 'staging', 'xahau'].includes(network) ? false : network
export const xahauNetwork = network.includes('xahau')

export const networks = {
  mainnet: {
    id: 0,
    server: 'https://bithomp.com',
    nativeCurrency: 'XRP',
    getCoinsUrl: '/go/buy-first-xrp',
    explorerName: 'XRPL',
    ledgerName: 'XRPL',
    minLedger: 32570,
    subname: ''
  },
  staging: {
    id: 2,
    server: 'https://staging.bithomp.com',
    nativeCurrency: 'XRP',
    getCoinsUrl: '/faucet',
    explorerName: 'XRPL Staging',
    ledgerName: 'XRPL',
    minLedger: 32570,
    subname: ''
  },
  testnet: {
    id: 1,
    server: 'https://test.xrplexplorer.com',
    nativeCurrency: 'XRP',
    getCoinsUrl: '/faucet',
    explorerName: 'XRPL Testnet',
    ledgerName: 'XRPL',
    minLedger: 1,
    subname: 'Testnet'
  },
  devnet: {
    id: 2,
    server: 'https://dev.xrplexplorer.com',
    nativeCurrency: 'XRP',
    getCoinsUrl: '/faucet',
    explorerName: 'XRPL Devnet',
    ledgerName: 'XRPL',
    minLedger: 1,
    subname: 'Devnet'
  },
  xahau: {
    id: 21337,
    server: 'https://xahauexplorer.com',
    nativeCurrency: 'XAH',
    getCoinsUrl: null,
    explorerName: 'Xahau',
    ledgerName: 'Xahau',
    minLedger: 1,
    subname: ''
  },
  'xahau-testnet': {
    id: 21338,
    server: 'https://test.xahauexplorer.com',
    nativeCurrency: 'XAH',
    getCoinsUrl: '/faucet',
    explorerName: 'Xahau Testnet',
    ledgerName: 'Xahau',
    minLedger: 3,
    subname: 'Testnet'
  },
  'xahau-jshooks': {
    id: 31338,
    server: 'https://jshooks.xahauexplorer.com',
    nativeCurrency: 'XAH',
    getCoinsUrl: '/faucet',
    explorerName: 'Xahau JS Hooks',
    ledgerName: 'Xahau',
    minLedger: 12,
    subname: 'JS Hooks'
  }
}

// show error if network is not found
if (!networks[network]) {
  if (network) {
    throw new Error('Network not found: ' + network + ' it can be one of those: ' + Object.keys(networks).join(', '))
  } else {
    throw new Error('Network needs to be defined in .env.local file')
  }
}

export const server = webAddress || networks[network]?.server
export const networkId = networks[network]?.id
export const nativeCurrency = networks[network]?.nativeCurrency
export const getCoinsUrl = networks[network]?.getCoinsUrl
export const explorerName = networks[network]?.explorerName
export const ledgerName = networks[network]?.ledgerName
export const ledgerSubName = networks[network]?.subname
export const minLedger = networks[network]?.minLedger
const webAddressParts = server?.replace('http://', '').replace('https://', '').split('.')
export const webSiteName =
  webAddressParts[webAddressParts.length - 2] + '.' + webAddressParts[webAddressParts.length - 1]

export const avatarServer = 'https://cdn.' + webSiteName + '/avatar/'

export const avatarSrc = (address, refreshPage) => {
  /*
    1) if in blacklist - alert image
    2) if bithomp image, show it 
    3) if valid twitter - image from twitter
    4) if gravatar - image from gravatar 
    5) if xamanPro or xamanCurratedAssets - from xaman 
    6) otherwise show hashicon
  */
  if (!address) return ''
  return avatarServer + address + (refreshPage ? '?' + refreshPage : '')
}

export const networksIds = {
  0: { server: 'https://bithomp.com', name: 'mainnet' },
  1: { server: 'https://test.xrplexplorer.com', name: 'testnet' },
  2: { server: 'https://dev.xrplexplorer.com', name: 'devnet' },
  21337: { server: 'https://xahauexplorer.com', name: 'xahau' },
  21338: { server: 'https://test.xahauexplorer.com', name: 'xahau-testnet' },
  31338: { server: 'https://jshooks.xahauexplorer.com', name: 'xahau-jshooks' }
}

const WssServer = () => {
  let token = ''
  if (process.env.NODE_ENV === 'development') {
    token = '?x-bithomp-token=' + process.env.NEXT_PUBLIC_BITHOMP_API_TEST_KEY
  }
  return server?.replace('https://', 'wss://') + '/wss/' + token
}
export const wssServer = WssServer()

export const networkMinimumDate = (type = 'ledger') => {
  let minDate = null

  if (type === 'nft') {
    if (network === 'mainnet') {
      minDate = new Date('2022-10-31T20:50:51.000Z') // first nft on the xrpl mainent
    } else if (network === 'xahau') {
      minDate = new Date('2023-11-01T13:00:29.000Z') //first nft on xahau
    } else if (network === 'xahau-testnet') {
      minDate = new Date('2023-01-28T08:35:30.000Z') //first nft on xahau-testnet
    } else if (network === 'xahau-jshooks') {
      minDate = new Date('2024-10-21T08:59:00.000Z') //first nft on xahau-jshooks
    } else if (network === 'testnet') {
      minDate = new Date('2023-08-09T01:53:41.000Z') // first nft in history for the testnet
    } else if (network === 'devnet') {
      minDate = new Date('2023-09-19T20:36:40.000Z') // first nft in history for the devnet
    } else {
      minDate = new Date('2013-01-01T03:21:10.000Z') // ledger 32570
    }
  }

  if (!minDate) {
    if (network === 'xahau') {
      minDate = new Date('2023-10-30T12:21:00.000Z') // ledger 2 on xahau
    } else if (network === 'xahau-testnet') {
      minDate = new Date('2023-01-27T13:07:10.000Z') // ledger 3 on xahau-testnet
    } else if (network === 'xahau-jshooks') {
      minDate = new Date('2024-10-21T08:59:00.000Z') // ledger 12 on xahau-jshooks
    } else {
      minDate = new Date('2013-01-01T03:21:10.000Z') // ledger 32570 on mainnet
    }
  }

  return minDate
}

export const isEmailValid = (x) => {
  let re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return x && re.test(x)
}

export const isUrlValid = (x) => {
  let re = new RegExp(
    '^(https?:\\/\\/)?' + // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d_]*)?$',
    'i'
  ) // fragment locator
  return !!re.test(x)
}

export const stripDomain = (x) => {
  if (!x) return ''
  x = x.replace('http://', '')
  x = x.replace('https://', '')
  x = x.replace('www.', '')
  x = x.split('/')[0]
  return x
}

export const isDomainValid = (x) => {
  return x && /^(?!:\/\/)([a-zA-Z0-9-_]{1,63}\.)+[a-zA-Z]{2,}$/.test(x)
}

export const isAddressValid = (x) => {
  return isValidClassicAddress(x)
}

export const isTagValid = (x) => {
  if (!x) return false
  if (!/^[0-9]{1,10}$/.test(x)) return false
  if (parseInt(x) > 4294967295) return false
  return true
}

export const isUsernameValid = (x) => {
  return x && /^(?=.{3,18}$)[0-9a-zA-Z]{1,18}[-]{0,1}[0-9a-zA-Z]{1,18}$/.test(x)
}

export const isAddressOrUsername = (x) => {
  return isAddressValid(x) || isUsernameValid(x)
}

export const isCurrencyHashValid = (x) => {
  return /^[0-9a-zA-Z]{40}$/.test(x)
}

export const isIdValid = (x) => {
  return /^[0-9a-zA-Z]{64}$/.test(x)
}

export const isValidCTID = (x) => {
  return /^[cC]{1}[a-fA-F0-9]{15}$/.test(x)
}

export const isValidUUID = (x) => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(x)
}

export const isValidNftXls20 = (x) => {
  // if starts with 000, the 4th one is from 0 to (1+2+4+8) 15 (F)
  if (isIdValid(x) && x.substring(0, 3) === '000') return true
  return false
}

export const isValidJson = (x) => {
  try {
    JSON.parse(x)
  } catch (e) {
    return false
  }
  return true
}

const makeXfl = (exponent, mantissa) => {
  const minMantissa = 1000000000000000n
  const maxMantissa = 9999999999999999n
  const minExponent = -96
  const maxExponent = 80

  // convert types as needed
  if (typeof exponent != 'bigint') exponent = BigInt(exponent)

  if (typeof mantissa != 'bigint') mantissa = BigInt(mantissa)

  // canonical zero
  if (mantissa == 0n) return 0n

  // normalize
  let is_negative = mantissa < 0
  if (is_negative) mantissa *= -1n

  while (mantissa > maxMantissa) {
    mantissa /= 10n
    exponent++
  }
  while (mantissa < minMantissa) {
    mantissa *= 10n
    exponent--
  }

  // canonical zero on mantissa underflow
  if (mantissa == 0) return 0n

  // under and overflows
  if (exponent > maxExponent || exponent < minExponent) return -1 // note this is an "invalid" XFL used to propagate errors

  exponent += 97n

  let xfl = !is_negative ? 1n : 0n
  xfl <<= 8n
  xfl |= BigInt(exponent)
  xfl <<= 54n
  xfl |= BigInt(mantissa)

  return xfl
}

const floatToXfl = (fl) => {
  let e = 0
  let d = '' + parseFloat('' + fl)
  d = d.toLowerCase()
  let s = d.split('e')
  if (s.length == 2) {
    e = parseInt(s[1])
    d = s[0]
  }
  s = d.split('.')
  if (s.length == 2) {
    d = d.replace('.', '')
    e -= s[1].length
  } else if (s.length > 2) d = 0n
  return makeXfl(e, d)
}

const changeEndianness = (string) => {
  const result = []
  let len = string.length - 2
  while (len >= 0) {
    result.push(string.substr(len, 2))
    len -= 2
  }
  return result.join('')
}

export const floatToXlfHex = (fl) => {
  if (!fl) return null
  fl = floatToXfl(fl)
  fl = fl.toString(16)
  fl = changeEndianness(fl)
  return fl.toUpperCase()
}

export const rewardRateHuman = (rewardRate) => {
  rewardRate = parseFloat(rewardRate)
  if (!rewardRate) return '0 % pa'
  if (rewardRate < 0 || rewardRate > 1) return 'Invalid rate'
  return Math.round(((1 + rewardRate) ** 12 - 1) * 10000) / 100 + ' % pa'
}

export const encodeAddressR = (address) => {
  if (!address) return null
  return decodeAccountID(address).toString('hex').toUpperCase()
}

export const shortName = (name, options) => {
  name = stripText(name)
  if (!options) {
    options = {}
  }
  if (!options.maxLength) {
    options.maxLength = 18
  }
  if (name?.length > options.maxLength) {
    name = name.slice(0, name.slice(0, options.maxLength).lastIndexOf(' ')) + '...'
    if (name.length > options.maxLength + 3) {
      name = name.slice(0, options.maxLength) + '...'
    }
  }
  return name
}

export const isAmountInNativeCurrency = (amount) => {
  if (!amount) return false
  return !amount?.issuer && !amount?.mpt_issuance_id
}

export const xls14NftValue = (value) => {
  if (!value) return value
  value = value.toString()
  if (value.includes('e-')) {
    let power = Number(value.slice(-2))
    const number = value.slice(0, -4)
    const numberLength = number.length
    power = power + (16 - numberLength)
    if (power > 84 && power < 97) {
      const powCalc = 15 - (96 - power)
      return Number(number) / Math.pow(10, powCalc)
    }
  }
  if (value.includes('0.0000000000000000000000000000000000000000000000000000000000000000000000')) {
    value = value.replace('0.0', '')
    return value.replace(/^0+/, '')
  }
  return false
}
