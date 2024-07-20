import { axiosAdmin } from "./axios"

export const submitProAddressToVerify = async (data, callback) => {
  const response = await axiosAdmin.post('user/addresses/', data).catch(error => {
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
  const response = await axiosAdmin.delete('user/address/' + id).catch(error => {
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