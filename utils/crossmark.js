import sdk from '@crossmarkio/sdk'
import { broadcastTransaction, getNextTransactionParams } from './user'

const useOurServer = true

const hasExtension = async () => {
  try {
    // Use isInstalled method from SDK
    return sdk.methods.isInstalled()
  } catch {
    return false
  }
}

const crossmarkSign = async ({
  address,
  tx,
  signRequest,
  afterSubmitExe,
  afterSigning,
  onSignIn,
  setStatus,
  setAwaiting,
  t
}) => {
  const signRequestData = signRequest.data

  // If the transaction field Account is not set, the account of the user's wallet will be used.

  if (signRequestData?.signOnly) {
    const signResult = await sdk.async.signAndWait(tx)

    if (signResult?.response?.data?.txBlob) {
      afterSigning({ signRequestData, blob: signResult.response.data.txBlob, address })
    } else {
      setStatus('Failed to sign transaction')
    }
  } else {
    const wallet = 'crossmark'

    if (!tx || tx?.TransactionType === 'SignIn') {
      onSignIn({ address, wallet, redirectName: signRequest.redirect })
      //keept afterSubmitExe here to close the dialog form when signedin
      afterSubmitExe({})
      return
    }

    if (useOurServer) {
      //get fee
      setAwaiting(true)
      setStatus('Getting transaction fee...')
      const txFee = await getNextTransactionParams(tx)
      setAwaiting(false)
      tx.Sequence = txFee.Sequence
      tx.Fee = txFee.Fee
      //tx.LastLedgerSequence = txFee.LastLedgerSequence //crossmark has it own lastLedgerSequence
      setStatus('Sign the transaction in Crossmark.')

      const signResult = await sdk.async.signAndWait(tx)
      const blob = signResult.response.data.txBlob

      //now submit transaction
      setStatus('Submitting transaction to the network...')
      setAwaiting(true)
      broadcastTransaction({
        blob,
        setStatus,
        onSignIn,
        afterSubmitExe,
        address,
        wallet,
        signRequest,
        tx,
        setAwaiting,
        t
      })
    } else {
      const signResult = sdk.sync.signAndSubmit(tx)

      const txHash = signResult?.response?.data?.id
      const redirectName = signRequest.redirect
      if (txHash) {
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
  account
}) => {
  try {
    // Check if extension is installed
    const installed = await hasExtension()
    if (!installed) {
      setStatus('Crossmark wallet extention is not installed in your browser. Try again after the installation.')
      return
    }

    if (account?.address && account?.wallet === 'crossmark') {
      // account is known
      const address = account.address
      crossmarkSign({ address, tx, signRequest, afterSubmitExe, afterSigning, onSignIn, setStatus, setAwaiting, t })
    } else {
      //get address from crossmark
      const signInResult = await sdk.async.signInAndWait()
      const address = signInResult?.response?.data?.address
      if (!tx.Account) {
        tx.Account = address
      }
      crossmarkSign({ address, tx, signRequest, afterSubmitExe, afterSigning, onSignIn, setStatus, setAwaiting, t })
    }

    setAwaiting(true)
  } catch (error) {
    console.error('Crossmark error:', error)
    setStatus(error.message || 'Error crossmark 101')
  }
}
