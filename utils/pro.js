import { axiosAdmin } from './axios'
import { capitalize } from './format'

export const crawlerStatus = (crawler) => {
  if (!crawler) return 'Not started'
  //“paused”, “queued”, “running”, “synced”
  const color = crawler.status === 'paused' ? 'red' : crawler.status === 'queued' ? 'orange' : 'green'
  return <span className={color + (crawler.status === 'synced' ? ' bold' : '')}>{capitalize(crawler.status)}</span>
}

export const activateAddressCrawler = async (address, callback) => {
  if (!address) return
  const response = await axiosAdmin.post('user/address/' + address + '/crawler', {}).catch((error) => {
    if (callback) {
      callback({ error: error.response?.data?.error || error.message })
    }
  })
  const json = response?.data
  /*
    {
      "id": "1",
      "status": "queued",
      "createdAt": 1728212999,
      "updatedAt": 1728212999,
      "lastCrawledAt": null,
      "firstLedgerIndex": null,
      "currentLedgerIndex": null,
      "lastLedgerIndex": null
    }
  */
  if (json) {
    callback(json)
  }
}

export const submitProAddressToVerify = async (data, callback) => {
  const response = await axiosAdmin.post('user/addresses/', data).catch((error) => {
    if (callback) {
      callback({ error: error.response?.data?.error || error.message })
    }
  })
  const json = response?.data
  /*
    {
      "id": 1,
      "createdAt": 1721461101,
      "address": "raiytiuhibutvbuiyh",
      "name": "vasia"
    }
  */
  if (json?.address) {
    if (callback) {
      callback(json)
    }
  }
}

export const removeProAddress = async (id, callback) => {
  if (!id) return
  const response = await axiosAdmin.delete('user/address/' + id).catch((error) => {
    if (callback) {
      callback({ error: error.response?.data?.error || error.message })
    }
  })
  const json = response?.data
  /*
    {id: 3, createdAt: 1721468586, address: 'riuyiuy', name: 'vasia4'}
  */
  if (json?.address) {
    if (callback) {
      callback(json)
    }
  }
}
