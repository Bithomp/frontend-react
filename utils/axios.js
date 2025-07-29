import axios from 'axios'
import { devNet, server } from '.'

export const axiosServer = axios.create({
  headers: {
    common: { 'x-bithomp-token': process.env.NEXT_PUBLIC_BITHOMP_API_KEY }
  },
  baseURL: server + '/api/'
})

export const axiosAdmin = axios.create({
  baseURL: server + '/api/partner/'
})

//keep it here, for when page is refreshed.
axiosAdmin.interceptors.request.use(
  (config) => {
    const sessionToken = localStorage.getItem('sessionToken')?.replace(/['"]+/g, '')
    if (sessionToken && !config.headers.common['Authorization']) {
      config.headers.common['Authorization'] = `Bearer ${sessionToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export const passHeaders = (req) => {
  let headers = {}
  //we need to pass only some headers, otherwise axios error
  if (req.headers['x-real-ip']) {
    headers['x-real-ip'] = req.headers['x-real-ip']
  }
  if (req.headers['x-forwarded-for']) {
    headers['x-forwarded-for'] = req.headers['x-forwarded-for']
  }
  if (req.headers['user-agent']) {
    headers['user-agent'] = req.headers['user-agent']
  }
  return headers
}

export const currencyServer = (req) => {
  const reqCookieCurrency = req?.headers?.cookie || ''
  const parsedcookieCurrency = Object.fromEntries(reqCookieCurrency.split('; ').map((c) => c.split('=')))
  return parsedcookieCurrency['currency'] || 'usd'
}

export const getFiatRateServer = async (req) => {
  let fiatRateServer = null
  let selectedCurrencyServer = 'usd'
  try {
    selectedCurrencyServer = currencyServer(req)
    if (!devNet) {
      const rateServer = await axiosServer({
        method: 'get',
        url: 'v2/rates/current/' + selectedCurrencyServer,
        headers: passHeaders(req)
      })
      fiatRateServer = rateServer?.data[selectedCurrencyServer] || null
    }
  } catch (e) {
    console.error(e)
  }
  return { fiatRateServer, selectedCurrencyServer }
}
