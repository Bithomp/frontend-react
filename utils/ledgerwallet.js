import TransportWebHID from '@ledgerhq/hw-transport-webhid'
import Xrp from '@ledgerhq/hw-app-xrp'
import { broadcastTransaction, getNextTransactionParams } from './user'
import { encode } from 'xrpl-binary-codec-prerelease'
import { nativeCurrency, xahauNetwork } from '.'
import { xahauDefinitions } from './xahau'

const errorHandle = (error) => {
  const msg = String(error?.message || error)
  const statusCode = error?.statusCode

  // App-level status from Ledger (e.g. 0x650f when app is not open)
  if (error?.name === 'TransportStatusError' && typeof statusCode === 'number') {
    console.error('Ledger TransportStatusError:', statusCode, error.statusText)

    if (statusCode === 0x650f) {
      throw new Error('Please unlock your Ledger device and open the ' + nativeCurrency + ' app, then try again.')
    }

    // CLA_NOT_SUPPORTED
    if (statusCode === 0x6e00) {
      throw new Error(
        'This Ledger app does not support the requested command. Make sure the ' + nativeCurrency + ' app is open.'
      )
    }

    if (statusCode === 0x6985) {
      throw new Error('Signing cancelled on your Ledger device.')
    }

    throw new Error(`Ledger error: ${error.statusText || 'Unknown status'} (0x${statusCode.toString(16)})`)
  }

  // Device already in use (other tab/app)
  if (msg.includes('already open') || error?.name === 'InvalidStateError') {
    console.warn('Ledger WebHID: device is already open somewhere else.')
    throw new Error('Ledger device is already in use. Close other Ledger apps or browser tabs and try again.')
  }

  if (msg.includes('Locked device')) {
    console.error('Ledger device is locked. Please enter your PIN.')
    throw new Error('Ledger device is locked. Please unlock it by entering your PIN.')
  }

  if (msg.includes('TransportError')) {
    console.error('Transport error: Unable to communicate with Ledger device.')
    throw new Error('Transport error. Ensure your device is connected properly.')
  }

  console.error('An unexpected error occurred:', error)
  throw new Error('An unexpected error occurred while connecting to the Ledger device.')
}

// 🔒 one instance for module
let xrpAppPromise = null
let xrpAppInstance = null

const connectLedgerHID = async () => {
  // if already connected - reuse it
  if (xrpAppPromise) return xrpAppPromise

  xrpAppPromise = TransportWebHID.create()
    .then((transport) => {
      const app = new Xrp(transport)
      xrpAppInstance = app

      // if transport supports 'on' method - listen for disconnect event
      if (typeof transport.on === 'function') {
        transport.on('disconnect', () => {
          xrpAppPromise = null
          xrpAppInstance = null
        })
      }

      return app
    })
    .catch((error) => {
      xrpAppPromise = null
      xrpAppInstance = null
      errorHandle(error)
    })

  return xrpAppPromise
}

const getLedgerAddress = async (xrpApp, path = "44'/144'/0'/0/0") => {
  try {
    const result = await xrpApp.getAddress(path)
    return result
  } catch (error) {
    errorHandle(error)
  }
}

// one helper for both XRPL & Xahau
const encodeTx = (tx) => (xahauNetwork ? encode(tx, xahauDefinitions) : encode(tx))

const signTransactionWithLedger = async (xrpApp, tx, path = "44'/144'/0'/0/0") => {
  try {
    const encodetx = encodeTx(tx)
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
  setAwaiting,
  t
}) => {
  const signRequestData = signRequest.data

  if (signRequestData?.signOnly) {
    setStatus('Sign the transaction in Ledger Wallet.')
    try {
      const signature = await signTransactionWithLedger(xrpApp, tx)
      tx.TxnSignature = signature
      const blob = encodeTx(tx)
      afterSigning({ signRequestData, blob, address })
    } catch (err) {
      setStatus(err.message)
    }
  } else {
    const wallet = 'ledgerwallet'
    setAwaiting(true)

    if (!tx || tx?.TransactionType === 'SignIn') {
      onSignIn({ address, wallet, redirectName: signRequest.redirect })
      // keep afterSubmitExe here to close the dialog form when signed in
      afterSubmitExe({})
      return
    }

    setStatus('Getting transaction fee...')
    const params = await getNextTransactionParams(tx)
    setAwaiting(false)
    if (params) {
      tx.Sequence = params.Sequence
      tx.Fee = params.Fee
      tx.LastLedgerSequence = params.LastLedgerSequence
    } else {
      setStatus('Error getting transaction fee.')
      return
    }

    setStatus('Sign the transaction in Ledger Wallet.')
    try {
      const signature = await signTransactionWithLedger(xrpApp, tx)
      tx.TxnSignature = signature

      // use same encoding as for signing
      const blob = encodeTx(tx)

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
    } catch (err) {
      setStatus(err.message)
    }
  }
}

export const ledgerwalletTxSend = async ({
  tx,
  signRequest,
  afterSubmitExe,
  afterSigning,
  onSignIn,
  setStatus,
  setAwaiting,
  t
}) => {
  try {
    const xrpApp = await connectLedgerHID()
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
      setAwaiting,
      t
    })
  } catch (err) {
    setStatus(err.message)
  }
}

// 🔌 explicit disconnect for sign-out
export const ledgerwalletDisconnect = async () => {
  if (!xrpAppInstance) return

  try {
    await xrpAppInstance.transport.close()
  } catch (e) {
    console.warn('Error while closing Ledger transport', e)
  } finally {
    xrpAppInstance = null
    xrpAppPromise = null
  }
}
