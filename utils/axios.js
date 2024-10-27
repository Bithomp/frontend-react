import axios from 'axios'
import { server } from '.'
import Cookies from 'universal-cookie'

const cookies = new Cookies()

export const axiosServer = axios.create({
  headers: {
    common: { 'x-bithomp-token': process.env.NEXT_PUBLIC_BITHOMP_API_KEY }
  },
  baseURL: server + '/api/'
})

export const axiosAdmin = axios.create({
  baseURL: server + '/api/partner/'
})

axiosAdmin.interceptors.request.use(
  (config) => {
    const sessionToken = cookies.get('sessionToken')
    if (sessionToken) {
      config.headers.common['Authorization'] = `Bearer ${sessionToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)
