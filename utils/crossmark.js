import sdk from '@crossmarkio/sdk'

const hasExtension = async () => {
  try {
    // Use isInstalled method from SDK
    return sdk.methods.isInstalled()
  } catch {
    return false
  }
}

export const crossmarkTxSend = async ({
  tx,
  signRequest,
  afterSubmitExe,
  afterSigning,
  onSignIn,
  setStatus,
  setAwaiting,
  t,
  setScreen
}) => {
  try {
    // Check if extension is installed
    const installed = await hasExtension()
    if (!installed) {
      setStatus('Crossmark wallet extention is not installed in your browser. Try again after the installation.')
      return
    }

    setAwaiting(true)
    console.log(tx.TransactionType)
    // If it's a SignIn transaction
    if (tx.TransactionType === 'SignIn') {
      const signInResult = await sdk.async.signInAndWait()
      if (signInResult?.response?.data?.address) {
        await onSignIn({
          address: signInResult.response.data.address,
          wallet: 'crossmark'
        })
        setAwaiting(false)
        setScreen('')
        return
      }
    }

    // For other transaction types
    const signResult = await sdk.async.signAndWait(tx)

    if (!signResult?.response?.data?.txBlob) {
      throw new Error('Failed to sign transaction')
    }

    // Process after successful signing
    if (signRequest?.data) {
      await afterSigning({
        signRequestData: signRequest.data,
        blob: signResult.response.data,
        address: tx.Account
      })
    }

    // Submit transaction
    const submitResult = await sdk.async.submitAndWait(tx.Account, signResult.response.data.txBlob)

    if (!submitResult?.response?.data?.resp?.result?.hash) {
      throw new Error('Failed to submit transaction')
    }

    // Process after successful submission
    await afterSubmitExe({
      txHash: submitResult.response.data.resp.result.hash,
      txType: tx.TransactionType,
      redirectName: signRequest?.redirect,
      broker: signRequest?.broker?.name
    })
  } catch (error) {
    console.error('Crossmark error:', error)
    setStatus(t('signin.crossmark.error', { error: error.message }))
  } finally {
    setAwaiting(false)
  }
}
