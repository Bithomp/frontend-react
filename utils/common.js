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
