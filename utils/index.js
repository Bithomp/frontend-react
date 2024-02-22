import axios from 'axios'
import { useCallback, useEffect, useState } from "react"
import { Buffer } from 'buffer'
import { decodeAccountID, isValidClassicAddress } from 'ripple-address-codec'

export const chartSpan = period => {
  if (!period) return ""

  if (period === "hour") {
    return "minute"
  } else if (period === "day") {
    return "hour"
  } else if (period === "week") {
    return "day"
  } else if (period === "month") {
    return "day"
  } else if (period === "year") {
    return "month"
  } else if (period === "all") {
    return "year"
  }

  if (period?.includes("..")) {
    const periodParts = period.split("..")
    const startDate = new Date(periodParts[0])
    const endDate = new Date(periodParts[1])
    const oneHour = 60 * 60 * 1000
    const oneDay = 24 * oneHour
    const oneMonth = 30 * oneDay
    if ((endDate - startDate) <= oneHour) {
      return "minute"
    } else if ((endDate - startDate) <= 60 * oneHour) {
      return "hour"
    } else if ((endDate - startDate) <= 60 * oneDay) {
      return "day"
    } if ((endDate - startDate) <= 60 * oneMonth) {
      return "month"
    } else {
      "year"
    }
  }
}

export const delay = async (milliseconds, callback, options) => {
  const delayFunction = () => {
    return new Promise(resolve => {
      setTimeout(resolve, milliseconds)
    })
  }
  await delayFunction()
  callback(options)
}

//https://github.com/XRPLF/CTID/blob/main/ctid.js#L24C31-L24C31 by Richard
export const decodeCTID = ctid => {
  let ctidValue
  if (typeof (ctid) === 'string') {
    if (!/^[0-9A-F]+$/.test(ctid))
      throw new Error("ctid must be a hexadecimal string or BigInt")

    if (ctid.length !== 16)
      throw new Error("ctid must be exactly 16 nibbles and start with a C")

    ctidValue = BigInt('0x' + ctid)
  }
  else if (typeof (ctid) === 'bigint')
    ctidValue = ctid;
  else
    throw new Error("ctid must be a hexadecimal string or BigInt")

  if (ctidValue > 0xFFFFFFFFFFFFFFFFn ||
    (ctidValue & 0xF000000000000000n) != 0xC000000000000000n)
    throw new Error("ctid must be exactly 16 nibbles and start with a C")

  const ledgerIndex = Number((ctidValue >> 32n) & 0xFFFFFFFn)
  const txIndex = Number((ctidValue >> 16n) & 0xFFFFn)
  const networkId = Number(ctidValue & 0xFFFFn)
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
  { value: 'vnd', label: 'VND' },
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
      const item = localStorage.getItem(key);
      if (item && item !== "undefined") {
        return JSON.parse(item);
      }

      if (typeof initialValue !== "undefined") {
        localStorage.setItem(key, JSON.stringify(initialValue));
        return initialValue;
      } else {
        return null
      }
    } catch {
      if (typeof initialValue !== "undefined") {
        return initialValue
      } else {
        return null
      }
    }
  }

  const [state, setState] = useState(null);

  useEffect(() => {
    setState(initialize(key));
  }, []);

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setState(valueToStore);
        localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.log(error);
      }
    },
    [key, setState]
  );

  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      console.log(error);
    }
  }, [key]);

  return [state, setValue, remove];
};

const shallRemoveParam = (tabList, tab, defaultTab, setTab) => {
  const existTab = tabList.some(t => t.value === tab);
  if (!existTab) {
    setTab(defaultTab);
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
  if (!addList.length) return;
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
  if (!text) return ""
  text = text.toString() //For buffer/hex
  return text
}

export const typeNumberOnly = e => {
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
    e.preventDefault();
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
    const splitedByDot = e.target.value.split(".")
    if (splitedByDot[0].length > 9 || splitedByDot[1].length > 5) {
      e.preventDefault()
      return
    }
  } else if (e.target.value.length > 9) {
    e.preventDefault()
    return
  }
}

export const decode = code => {
  if (!code) return null
  const decodedHex = Buffer.from(code, 'hex')
  const decodedString = decodedHex.toString()
  if (!decodedString.includes('�')) return stripText(decodedString)
  return stripText(code)
}

export const encode = code => {
  return Buffer.from(code).toString('hex').toUpperCase()
}

//not in use yet
export const submitTransaction = async (blob, callback) => {
  blob = JSON.stringify(blob);

  const response = await axios.post('v2/transaction/submit', blob).catch(error => {
    console.log("submitTransaction error:", error.message)
  });

  if (response) {
    callback(response);
  }
}

//const devNetworks = ['testnet', 'devnet', 'xahau-testnet'];

export const capitalize = str => {
  if (!str) return ""
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const network = process.env.NEXT_PUBLIC_NETWORK_NAME
export const devNet = ['mainnet', 'staging', 'xahau'].includes(network) ? false : network
export const xahauNetwork = network.includes('xahau')

const networks = {
  mainnet: {
    id: 0,
    server: "https://bithomp.com",
    nativeCurrency: "XRP",
    getCoinsUrl: "/go/buy-first-xrp",
    explorerName: "XRP",
    ledgerName: "XRPL",
    minLedger: 32570
  },
  staging: {
    id: 2,
    server: "https://staging.bithomp.com",
    nativeCurrency: "XRP",
    getCoinsUrl: "/faucet/",
    explorerName: "XRP Staging",
    ledgerName: "XRPL",
    minLedger: 32570
  },
  testnet: {
    id: 1,
    server: "https://test.bithomp.com",
    nativeCurrency: "XRP",
    getCoinsUrl: "/faucet/",
    explorerName: "XRP TESTNET",
    ledgerName: "XRPL",
    minLedger: 1
  },
  devnet: {
    id: 2,
    server: "https://dev.bithomp.com",
    nativeCurrency: "XRP",
    getCoinsUrl: "/faucet/",
    explorerName: "XRP DEVNET",
    ledgerName: "XRPL",
    minLedger: 1
  },
  "xahau-testnet": {
    id: 21338,
    server: "https://test.xahauexplorer.com",
    nativeCurrency: "XAH",
    getCoinsUrl: "/faucet/",
    explorerName: "XAHAU TESTNET",
    ledgerName: "XAHAU",
    minLedger: 3
  },
  xahau: {
    id: 21337,
    server: "https://xahauexplorer.com",
    nativeCurrency: "XAH",
    getCoinsUrl: null,
    explorerName: "XAHAU",
    ledgerName: "XAHAU",
    minLedger: 1
  }
}

// show error if network is not found
if (!networks[network]) {
  if (network) {
    throw new Error("Network not found: " + network + ' it can be one of those: ' + Object.keys(networks).join(', '))
  } else {
    throw new Error("Network needs to be defined in .env.local file")
  }
}

export const server = networks[network]?.server
export const networkId = networks[network]?.id
export const nativeCurrency = networks[network]?.nativeCurrency
export const getCoinsUrl = networks[network]?.getCoinsUrl
export const explorerName = networks[network]?.explorerName
export const ledgerName = networks[network]?.ledgerName
export const minLedger = networks[network]?.minLedger

export const networksIds = {
  0: { server: "https://bithomp.com", name: "mainnet" },
  1: { server: "https://test.bithomp.com", name: "testnet" },
  2: { server: "https://dev.bithomp.com", name: "devnet" },
  21337: { server: "https://xahauexplorer.com", name: "xahau" },
  21338: { server: "https://test.xahauexplorer.com", name: "xahau-testnet" }
}

const WssServer = () => {
  let token = ''
  if (process.env.NODE_ENV === 'development') {
    token = '?x-bithomp-token=' + process.env.NEXT_PUBLIC_BITHOMP_API_TEST_KEY
  }
  return server?.replace("https://", "wss://") + '/wss/' + token
}
export const wssServer = WssServer()

export const isEmailValid = x => {
  let re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return x && re.test(x)
}

export const isUrlValid = x => {
  let re = new RegExp('^(https?:\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
    '(\\#[-a-z\\d_]*)?$', 'i') // fragment locator
  return !!re.test(x)
}

export const isDomainValid = x => {
  var re = /^((?:(?:(?:\w[\.\-\+]?)*)\w)+)((?:(?:(?:\w[\.\-\+]?){0,62})\w)+)\.(\w{2,6})$/
  return re.test(x)
}

export const isAddressValid = x => {
  return isValidClassicAddress(x)
}

export const isUsernameValid = x => {
  return x && /^(?=.{3,18}$)[0-9a-zA-Z]{1,18}[-]{0,1}[0-9a-zA-Z]{1,18}$/.test(x)
}

export const isAddressOrUsername = x => {
  return isAddressValid(x) || isUsernameValid(x)
}

export const isIdValid = x => {
  return /^[0-9a-zA-Z]{64}$/.test(x)
}

export const isValidCTID = x => {
  return /^[cC]{1}[a-fA-F0-9]{15}$/.test(x)
}

export const isValidNftXls20 = x => {
  // if starts with 000, the 4th one is from 0 to (1+2+4+8) 15 (F)
  if (isIdValid(x) && x.substring(0, 3) === '000') return true
  return false
}

export const isValidJson = x => {
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
  if (typeof (exponent) != 'bigint')
    exponent = BigInt(exponent);

  if (typeof (mantissa) != 'bigint')
    mantissa = BigInt(mantissa);

  // canonical zero
  if (mantissa == 0n)
    return 0n;

  // normalize
  let is_negative = mantissa < 0;
  if (is_negative)
    mantissa *= -1n;

  while (mantissa > maxMantissa) {
    mantissa /= 10n;
    exponent++;
  }
  while (mantissa < minMantissa) {
    mantissa *= 10n;
    exponent--;
  }

  // canonical zero on mantissa underflow
  if (mantissa == 0)
    return 0n;

  // under and overflows
  if (exponent > maxExponent || exponent < minExponent)
    return -1; // note this is an "invalid" XFL used to propagate errors

  exponent += 97n;

  let xfl = (!is_negative ? 1n : 0n);
  xfl <<= 8n;
  xfl |= BigInt(exponent);
  xfl <<= 54n;
  xfl |= BigInt(mantissa);

  return xfl;
}

const floatToXfl = fl => {
  let e = 0
  let d = "" + parseFloat("" + fl)
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
  }
  else if (s.length > 2)
    d = 0n;
  return makeXfl(e, d)
}

const changeEndianness = string => {
  const result = []
  let len = string.length - 2
  while (len >= 0) {
    result.push(string.substr(len, 2))
    len -= 2
  }
  return result.join('')
}

export const floatToXlfHex = fl => {
  if (!fl) return null
  fl = floatToXfl(fl)
  fl = fl.toString(16)
  fl = changeEndianness(fl)
  return fl.toUpperCase()
}

export const rewardRateHuman = rewardRate => {
  rewardRate = parseFloat(rewardRate)
  if (!rewardRate) return "0 % pa"
  if (rewardRate < 0 || rewardRate > 1) return "Invalid rate"
  return (Math.round((((1 + rewardRate) ** 12) - 1) * 10000) / 100) + " % pa"
}

export const encodeAddressR = address => {
  if (!address) return null
  return decodeAccountID(address).toString("hex").toUpperCase()
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
    name = name.slice(0, name.slice(0, options.maxLength).lastIndexOf(" ")) + '...'
    if (name.length > (options.maxLength + 3)) {
      name = name.slice(0, options.maxLength) + '...'
    }
  }
  return name
}
