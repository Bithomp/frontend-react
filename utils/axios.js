import axios from 'axios'
import { server } from '.'

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
