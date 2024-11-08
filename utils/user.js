import axios from 'axios'

//not in use yet
export const broadcastTransaction = async (blob, callback) => {
  blob = JSON.stringify(blob)

  const response = await axios.post('v2/transaction/submit', blob).catch((error) => {
    console.log('broadcastTransaction error:', error.message)
  })

  if (response) {
    callback(response)
  }
}
