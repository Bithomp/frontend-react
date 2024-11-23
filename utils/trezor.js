import TrezorConnect from '@trezor/connect-web'
import { broadcastTransaction, getNextTransactionParams } from './user'
import { server } from '.'

const initTrezor = async () => {
  try {
    await TrezorConnect.init({
      connectSrc: server,
      popup: true,
      webusb: true,
      lazyLoad: true,
      manifest: {
        email: 'support@bithomp.com',
        appUrl: server
      }
    })
  } catch (error) {
    throw new Error('Error initializing TrezorConnect: ' + error)
  }
}

const getTrezorAddress = async () => {
  try {
    const response = await TrezorConnect.rippleGetAddress({
      bundle: [
        { path: "m/44'/144'/0'/0/0", showOnTrezor: false } // account 1, address 1
        //{ path: "m/44'/144'/1'/0/0", showOnTrezor: false }, // account 2, address 1
        //{ path: "m/44'/144'/1'/0/1", showOnTrezor: false } // account 2, address 2
      ]
    })

    /*
    {
      success: true,
      payload: [
        { address: string, path: Array<number>, serializedPath: string }, // account 1, address 1
    */

    if (!response) {
      throw new Error('No response from Trezor.')
    }

    if (response?.success) {
      return response.payload[0].address
    } else {
      throw new Error(response.payload?.error)
    }
  } catch (error) {
    if (error.toString().includes('Manifest not set.')) {
      await initTrezor()
      return getTrezorAddress()
    } else {
      console.error('Error getting address from Trezor.', error)
      throw new Error('Error getting address from Trezor: ' + error)
    }
  }
}

const signTransactionWithTrezor = async (tx, path = "m/44'/144'/0'/0/0") => {
  /*
    type Payment = {
      amount: string,
      destination: string,
      destinationTag?: number,
    };
    export type RippleTransaction = {
      fee: string,
      flags?: number,
      sequence: number,
      maxLedgerVersion?: number, // Proto: “last_ledger_sequence”
      payment: Payment,
    };
  */

  try {
    const transaction = {
      fee: tx.Fee,
      //flags: tx.Flags,
      sequence: tx.Sequence,
      maxLedgerVersion: tx.LastLedgerSequence,
      payment: {
        amount: tx.Amount,
        destination: tx.Destination,
        destinationTag: tx.DestinationTag
      }
    }
    const result = await TrezorConnect.rippleSignTransaction({ path, transaction })
    /*
      {
        success: true,
        payload: {
          serializedTx: string,
          signature: string,
        }
      }
    */
    if (result.success) {
      return result.payload.serializedTx.toUpperCase()
    } else {
      throw new Error(result.payload.error)
    }
  } catch (error) {
    console.error('Failed to sign transaction:', error)
    throw new Error('Unable to sign transaction with Trezor: ' + error)
  }
}

const trezorSign = async ({
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
    setStatus('Sign the transaction in Trezor Wallet.')
    try {
      //there is no message signing =(, so set some rendom sequence and fee to sign
      tx.Sequence = 1
      tx.Fee = '1'
      const blob = await signTransactionWithTrezor(tx)
      afterSigning({ signRequestData, blob, address })
    } catch (err) {
      setStatus(err.message)
    }
  } else {
    const wallet = 'trezor'
    setAwaiting(true)

    if (!tx || tx?.TransactionType === 'SignIn') {
      onSignIn({ address, wallet, redirectName: signRequest.redirect })
      //keept afterSubmitExe here to close the dialog form when signedin
      afterSubmitExe({})
      return
    }

    setStatus('Getting transaction fee...')
    const params = await getNextTransactionParams(tx)
    setAwaiting(false)
    tx.Sequence = params.Sequence
    tx.Fee = params.Fee
    tx.LastLedgerSequence = params.LastLedgerSequence
    setStatus('Sign the transaction in Trezor Wallet.')
    try {
      const blob = await signTransactionWithTrezor(tx)
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
    } catch (err) {
      setStatus(err.message)
    }
  }
}

export const trezorTxSend = async ({
  tx,
  signRequest,
  afterSubmitExe,
  afterSigning,
  onSignIn,
  setStatus,
  account,
  setAwaiting,
  t
}) => {
  try {
    let address = null
    if (account?.address && account?.wallet === 'trezor') {
      // Trezor loggedin, account is known
      address = account.address
    } else {
      address = await getTrezorAddress()
    }

    if (!tx.Account) {
      tx.Account = address
    }
    //tx.SigningPubKey = publicKey?.toUpperCase()
    trezorSign({
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
