import axios from 'axios'

export const fetchCurrentFiatRate = async (currency, setRate) => {
  const response = await axios('v2/rates/current/' + currency)
  setRate(response?.data[currency])
}
