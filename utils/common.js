import axios from 'axios'
import { devNet } from '.'

export const fetchCurrentFiatRate = async (currency, setRate) => {
  if (devNet) return 0
  const response = await axios('v2/rates/current/' + currency)
  setRate(response?.data[currency])
}

export const fetchHistoricalRate = async ({ timestamp, selectedCurrency, setPageFiatRate }) => {
  if (!timestamp || !selectedCurrency || devNet) return
  const response = await axios(
    'v2/rates/history/nearest/' + selectedCurrency + '?date=' + new Date(timestamp).valueOf()
  ).catch(() => {
    console.log("ERROR: can't get historical rate")
  })
  const rate = response?.data?.[selectedCurrency] ?? response?.data?.[selectedCurrency.toLowerCase()]
  if (rate !== undefined) {
    const numericRate = Number(rate)
    if (typeof setPageFiatRate === 'function') setPageFiatRate(numericRate)
    return numericRate
  }
  return null
}

// Fetch the current fiat rate for an IOU/trustline token.
// setRate receives the rate as a number (how many selectedCurrency per 1 token).
export const fetchCurrentTokenFiatRate = async ({ issuer, currency, selectedCurrency, setRate }) => {
  if (devNet || !issuer || !currency || !selectedCurrency) return
  const response = await axios(
    `v2/trustlines/token/${issuer}/${encodeURIComponent(currency)}/rate/current?convertCurrencies=${selectedCurrency}`
  ).catch(() => null)
  const rate = response?.data?.[selectedCurrency.toLowerCase()]
  if (rate !== undefined) {
    const numericRate = Number(rate)
    if (typeof setRate === 'function') setRate(numericRate)
    return numericRate
  }
  return null
}

// Fetch the historical fiat rate for an IOU/trustline token at a given point in time.
// date can be a Unix timestamp in seconds or milliseconds (number), or an ISO string / Date object.
// setRate receives the rate as a number (how many selectedCurrency per 1 token).
export const fetchHistoricalTokenFiatRate = async ({ issuer, currency, date, selectedCurrency, setRate }) => {
  if (devNet || !issuer || !currency || !date || !selectedCurrency) return
  const rawTimestamp = typeof date === 'number' ? date : new Date(date).getTime()
  const timestamp = rawTimestamp < 1000000000000 ? rawTimestamp * 1000 : rawTimestamp
  const response = await axios(
    `v2/trustlines/token/${issuer}/${encodeURIComponent(currency)}/rate/history?date=${timestamp}&convertCurrencies=${selectedCurrency}`
  ).catch(() => null)
  const rate = response?.data?.[selectedCurrency.toLowerCase()]
  if (rate !== undefined) {
    const numericRate = Number(rate)
    if (typeof setRate === 'function') setRate(numericRate)
    return numericRate
  }
  return null
}
