import axios from 'axios'

export const broadcastTransaction = async ({
  blob,
  setStatus,
  onSignIn,
  afterSubmitExe,
  address,
  wallet,
  signRequest,
  tx
}) => {
  if (!blob) {
    setStatus('There is no blob to broadcast')
    return
  }
  const response = await axios.post('v2/transaction/submit', { signedTransaction: blob }).catch((error) => {
    if (error.response?.data?.message) {
      setStatus(error.response.data.message)
    } else {
      setStatus(error.message)
    }
  })

  if (response) {
    const txHash = response.hash
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
  }
}

export const getTransactionFee = async (tx) => {
  const response = await axios.post('xrpl/fee', tx).catch((error) => {
    console.error(error)
  })

  return response?.data?.fee
}
