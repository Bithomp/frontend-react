import TransportWebHID from '@ledgerhq/hw-transport-webhid'
import Xrp from '@ledgerhq/hw-app-xrp'
import { broadcastTransaction, getNextTransactionParams } from './user' //xahauDef
import { encode } from 'xrpl-binary-codec-prerelease' //XrplDefinitions, DEFAULT_DEFINITIONS
import { set } from 'nprogress'
//import { xahauNetwork } from '.'

//const definitions = xahauNetwork ? new XrplDefinitions(xahauDef) : DEFAULT_DEFINITIONS

const errorHandle = (error) => {
  // Handle specific errors based on the message or error type
  if (error.message.includes('already open')) {
    throw new Error('Something went wrong connecting to your Ledger. Please refresh your page and try again.')
  }

  // Handle LockedDeviceError: Device requires PIN entry
  if (error.message.includes('Locked device')) {
    console.error('Ledger device is locked. Please enter your PIN.')
    throw new Error('Ledger device is locked. Please unlock it by entering your PIN.')
  }

  // Handle TransportError (WebHID issues)
  if (error.message.includes('TransportError')) {
    console.error('Transport error: Unable to communicate with Ledger device.')
    throw new Error('Transport error. Ensure your device is connected properly.')
  }

  // General fallback for other errors
  console.error('An unexpected error occurred:', error)
  throw new Error('An unexpected error occurred while connecting to the Ledger device.')
}

const connectLedgerHID = async () => {
  return TransportWebHID.create()
    .then((transport) => new Xrp(transport))
    .catch((error) => {
      errorHandle(error)
    })
}

const getLedgerAddress = async (xrpApp, path = "44'/144'/0'/0/0") => {
  try {
    const result = await xrpApp.getAddress(path)
    return result
  } catch (error) {
    errorHandle(error)
  }
}

const signTransactionWithLedger = async (xrpApp, tx, path = "44'/144'/0'/0/0") => {
  try {
    const encodetx = encode(tx) //, DEFAULT_DEFINITIONS
    const signature = await xrpApp.signTransaction(path, encodetx)
    return signature.toUpperCase()
  } catch (error) {
    console.error('Failed to sign transaction:', error)
    throw new Error('Unable to sign transaction with Ledger via WebHID.')
  }
}

const ledgerwalletSign = async ({
  xrpApp,
  address,
  tx,
  signRequest,
  afterSubmitExe,
  afterSigning,
  onSignIn,
  setStatus,
  setAwaiting
}) => {
  const signRequestData = signRequest.data

  // If the transaction field Account is not set, the account of the user's wallet will be used.

  if (signRequestData?.signOnly) {
    try {
      const signature = await signTransactionWithLedger(xrpApp, tx)
      afterSigning({ signRequestData, blob: signature, address })
    } catch (err) {
      setStatus(err.message)
    }
  } else {
    const wallet = 'ledgerwallet'
    setAwaiting(true)

    if (!tx || tx?.TransactionType === 'SignIn') {
      onSignIn({ address, wallet, redirectName: signRequest.redirect })
      //keept afterSubmitExe here to close the dialog form when signedin
      afterSubmitExe({})
      return
    }

    //get fee
    setStatus('Getting transaction fee...')
    const params = await getNextTransactionParams(tx)
    setAwaiting(false)
    tx.Sequence = params.Sequence
    tx.Fee = params.Fee
    tx.LastLedgerSequence = params.LastLedgerSequence + 15
    setStatus('Sign the transaction in ledgerwallet.')
    try {
      const signature = await signTransactionWithLedger(xrpApp, tx)
      tx.TxnSignature = signature
      const blob = encode(tx) // , DEFAULT_DEFINITIONS
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
        setAwaiting
      })
    } catch (err) {
      setStatus(err.message)
    }
  }
}

export const ledgerwalletTxSend = async ({
  xrpApp,
  tx,
  signRequest,
  afterSubmitExe,
  afterSigning,
  onSignIn,
  setStatus,
  setAwaiting
}) => {
  try {
    if (!xrpApp) {
      xrpApp = await connectLedgerHID()
    }
    const { publicKey, address } = await getLedgerAddress(xrpApp)
    if (!tx.Account) {
      tx.Account = address
    }
    tx.SigningPubKey = publicKey?.toUpperCase()
    ledgerwalletSign({
      xrpApp,
      address,
      tx,
      signRequest,
      afterSubmitExe,
      afterSigning,
      onSignIn,
      setStatus,
      setAwaiting
    })
  } catch (err) {
    setStatus(err.message)
  }
}
