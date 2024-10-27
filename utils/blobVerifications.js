import axios from 'axios'

export const setAvatar = async (data, callback) => {
  const response = await axios.post('v2/avatar/' + data.address, { blob: data.blob }).catch((error) => {
    if (callback) {
      callback({ error: error.response?.data?.error || error.message })
    }
  })
  const json = response?.data
  /* {"result": "success"} */
  if (json?.result === 'success') {
    if (callback) {
      callback(json)
    }
  } else if (json?.error) {
    if (callback) {
      callback({ error: json.error })
    }
  }
}
