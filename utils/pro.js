import { axiosAdmin } from './axios'
import { capitalize, shortNiceNumber } from './format'

export const crawlerStatus = (crawler, options) => {
  if (!crawler) return 'Not started'
  //“paused”, “queued”, “running”, “synced”
  const color = crawler.status === 'paused' ? 'red' : crawler.status === 'queued' ? 'orange' : 'green'

  /*
    "crawler": {
      "status": "synced",
      "createdAt": 1728212999,
      "updatedAt": 1728252600,
      "lastCrawledAt": 1728252600,
      "firstLedgerIndex": 17741709,
      "currentLedgerIndex": 90592089,
      "lastLedgerIndex": 90592089
    }
  */

  return (
    <>
      <span className={color + (crawler.status === 'synced' ? ' bold' : '')}>{capitalize(crawler.status)}</span>
      {(crawler.status === 'queued' || crawler.status !== 'running') && (
        <>
          {options?.inline ? ' ' : <br />}
          {crawler.status === 'queued' && '1-10 min'}
          {crawler.status === 'running' &&
            shortNiceNumber(crawler.lastLedgerIndex - crawler.currentLedgerIndex) + ' ledgers to load, 2-20 min'}
        </>
      )}
    </>
  )
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

export const updateProAddress = async (id, data) => {
  if (!id || !data) return
  //{ settings: { escrowsExecution: false, nftokensOffersCancellation: true }}
  await axiosAdmin.put('user/address/' + id, data).catch((error) => {
    console.log(error)
  })
}
