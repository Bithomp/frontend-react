import axios from 'axios'
import { errorCodeDescription } from './transaction'

export const broadcastTransaction = async ({
  blob,
  setStatus,
  onSignIn,
  afterSubmitExe,
  address,
  wallet,
  signRequest,
  tx,
  setAwaiting
}) => {
  if (!blob) {
    setStatus('There is no blob to broadcast')
    setAwaiting(false)
    return
  }

  const response = await axios.post('v2/transaction/submit', { signedTransaction: blob }).catch((error) => {
    setAwaiting(false)
    if (error.response?.data?.result) {
      setStatus(errorCodeDescription(error.response.data.result))
    } else if (error.response?.data?.message) {
      setStatus(error.response.data.message)
    } else {
      setStatus(error.message)
    }
  })

  setAwaiting(false)

  const data = response?.data

  if (data) {
    const txHash = data.id
    if (txHash) {
      const redirectName = signRequest.redirect
      onSignIn({ address, wallet, redirectName })
      afterSubmitExe({
        redirectName,
        broker: signRequest.broker?.name,
        txHash,
        txType: tx.TransactionType
      })
    } else {
      //when failed transaction: onlyLogin, remove redirectName
      onSignIn({ address, wallet, redirectName: null })
    }
  } else {
    //when failed transaction: onlyLogin, remove redirectName
    onSignIn({ address, wallet, redirectName: null })
  }
}

export const getNextTransactionParams = async (tx) => {
  // If a custom fee is set, store it before getting params
  const customFee = tx.Fee

  const response = await axios.post('v2/transaction/nextTransactionParams', tx).catch((error) => {
    console.error(error)
  })

  const params = response?.data
  if (params && customFee) {
    // Restore the custom fee if it was set
    params.Fee = customFee
  }

  return params
}
