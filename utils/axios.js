import axios from 'axios'
import { devNet, normalizeFiatCurrency, server } from '.'

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

// Add session token to all default axios requests from localStorage directly,
// so child component effects (e.g. subscriptionExpired) don't race against
// the _app.js useEffect that sets axios.defaults.headers.common['Authorization'].
if (typeof window !== 'undefined') {
  axios.interceptors.request.use(
    (config) => {
      const sessionToken = localStorage.getItem('sessionToken')?.replace(/['"]+/g, '')
      if (sessionToken && !config.headers['Authorization'] && !config.headers.common?.['Authorization']) {
        config.headers['Authorization'] = `Bearer ${sessionToken}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )
}

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

export const requestIp = (req) => {
  const headers = req?.headers || {}
  const forwardedFor = headers['x-forwarded-for']
  const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')?.[0]?.trim()
  const realIp = Array.isArray(headers['x-real-ip']) ? headers['x-real-ip'][0] : headers['x-real-ip']

  return forwardedIp || realIp || req?.socket?.remoteAddress || 'unknown-ip'
}

const responseMessage = (data) => {
  if (!data) return ''
  if (typeof data === 'string') return data
  return data.error || data.message || ''
}

export const serverSideErrorText = (error) => {
  const method = error?.config?.method?.toUpperCase()
  const url = error?.config?.url
  const status = error?.response?.status
  const statusText = error?.response?.statusText
  const code = error?.code
  const message = responseMessage(error?.response?.data) || error?.message || String(error)
  const requestPart = [method, url].filter(Boolean).join(' ')
  const statusPart = status ? ` -> ${status}${statusText ? ` ${statusText}` : ''}` : ''
  const codePart = code ? ` (${code})` : ''

  return `${requestPart}${statusPart}${codePart}${message ? `: ${message}` : ''}`.trim()
}

export const logServerSideError = (error, req, label = 'SSR') => {
  if (process.env.NODE_ENV !== 'development') return
  console.warn(`${requestIp(req)}: ${label} ${serverSideErrorText(error)}`)
}

export const currencyServer = (req) => {
  try {
    const queryFiat = new URL(req?.url || '/', 'http://localhost').searchParams.get('fiat')
    const normalizedQueryFiat = normalizeFiatCurrency(queryFiat)
    if (normalizedQueryFiat) return normalizedQueryFiat
  } catch (_) {
    // Ignore malformed request URLs and fall back to cookies.
  }

  const reqCookieCurrency = req?.headers?.cookie || ''
  const parsedcookieCurrency = Object.fromEntries(reqCookieCurrency.split('; ').map((c) => c.split('=')))
  return normalizeFiatCurrency(parsedcookieCurrency['currency']) || 'usd'
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
    logServerSideError(e, req, 'getFiatRateServer')
  }
  return { fiatRateServer, selectedCurrencyServer }
}
