import axios from 'axios'

export const fetchCurrentFiatRate = async (currency, setRate) => {
  const response = await axios('v2/rates/current/' + currency)
  setRate(response?.data[currency])
}

export const fetchHistoricalRate = async ({ ledgerTimestamp, selectedCurrency, setPageFiatRate }) => {
  if (!ledgerTimestamp || !selectedCurrency || !setPageFiatRate) return
  const response = await axios(
    'v2/rates/history/nearest/' + selectedCurrency + '?date=' + new Date(ledgerTimestamp).valueOf()
  ).catch((error) => {
    console.log(error)
  })
  if (response?.data?.[selectedCurrency]) {
    setPageFiatRate(response.data[selectedCurrency])
  }
}
