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
  if (response?.data?.[selectedCurrency]) {
    setPageFiatRate(response.data[selectedCurrency])
  }
}

// Fetch the current fiat rate for an IOU/trustline token.
// setRate receives the rate as a number (how many selectedCurrency per 1 token).
export const fetchCurrentTokenFiatRate = async ({ issuer, currency, selectedCurrency, setRate }) => {
  if (devNet || !issuer || !currency || !selectedCurrency) return
  const response = await axios(
    `v2/trustlines/token/rate/current/${issuer}/${encodeURIComponent(currency)}?convertCurrencies=${selectedCurrency}`
  ).catch(() => null)
  const rate = response?.data?.[selectedCurrency.toLowerCase()]
  if (rate !== undefined) setRate(Number(rate))
}

// Fetch the historical fiat rate for an IOU/trustline token at a given point in time.
// date can be a Unix timestamp in seconds (number) or an ISO string / Date object.
// setRate receives the rate as a number (how many selectedCurrency per 1 token).
export const fetchHistoricalTokenFiatRate = async ({ issuer, currency, date, selectedCurrency, setRate }) => {
  if (devNet || !issuer || !currency || !date || !selectedCurrency) return
  const timestamp = typeof date === 'number' ? date : Math.floor(new Date(date).getTime() / 1000)
  const response = await axios(
    `v2/trustlines/token/rate/history/${issuer}/${encodeURIComponent(currency)}?date=${timestamp}&convertCurrencies=${selectedCurrency}`
  ).catch(() => null)
  const rate = response?.data?.[selectedCurrency.toLowerCase()]
  if (rate !== undefined) setRate(Number(rate))
}
