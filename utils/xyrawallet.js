// utils/xyrawallet.js
import sdk from '@xyrawallet/sdk'
import { broadcastTransaction } from './user'
import { networkId, xahauNetwork } from '.'

const getXyraNetwork = () => {
  if (xahauNetwork) {
    if (networkId === 21337) return 'xahau-mainnet'
    if (networkId === 21338) return 'xahau-testnet'
    return null
  }
  if (networkId === 0) return 'xrpl-mainnet'
  if (networkId === 1) return 'xrpl-testnet'
  return null
}

const normalizeErr = (e) => {
  const msg = String(e?.message || e || '')
  const low = msg.toLowerCase()

  if (low.includes('popup')) return 'Popup was blocked. Please allow popups and try again.'
  if (low.includes('reject')) return 'Request rejected in Xyra.'

  // This is NOT CORS. It's postMessage origin validation.
  if (low.includes('rejected message') || low.includes('expected from')) {
    return msg // keep exact message for debugging
  }

  return msg || 'Xyra error'
}

const xyraSign = async ({
  address,
  publicKey,
  tx,
  signRequest,
  afterSubmitExe,
  afterSigning,
  onSignIn,
  setStatus,
  setAwaiting,
  t
}) => {
  const wallet = 'xyra'
  const xyraNetwork = getXyraNetwork()
  const signRequestData = signRequest?.data

  if (!xyraNetwork) {
    setStatus('Xyra supports only Mainnet/Testnet for XRPL & Xahau (this network is not supported).')
    setAwaiting(false)
    return
  }

  // Login-only
  if (!tx || tx?.TransactionType === 'SignIn') {
    onSignIn({ address, wallet, redirectName: signRequest?.redirect })
    afterSubmitExe({})
    return
  }

  // Ensure Account + SigningPubKey
  const txToSign = { ...tx }
  if (!txToSign.Account) txToSign.Account = address
  if (publicKey && !txToSign.SigningPubKey) txToSign.SigningPubKey = String(publicKey).toUpperCase()

  // IMPORTANT:
  // For non-signOnly transactions you MUST pass tx already prepared with Fee/Sequence/LastLedgerSequence
  // BEFORE calling this function, otherwise you'll be forced to await and lose the user gesture.

  if (!signRequestData?.signOnly) {
    if (!txToSign.Fee || !txToSign.Sequence || !txToSign.LastLedgerSequence) {
      setStatus('Transaction is not prepared (Fee/Sequence/LastLedgerSequence missing).')
      return
    }
  }

  setStatus('Sign the transaction in Xyra.')
  try {
    const { tx_blob } = await sdk.sign({ transaction: txToSign, network: xyraNetwork })

    if (signRequestData?.signOnly) {
      afterSigning({ signRequestData, blob: tx_blob, address })
      return
    }

    // submit via our server
    setStatus('Submitting transaction to the network...')
    setAwaiting(true)
    broadcastTransaction({
      blob: tx_blob,
      setStatus,
      onSignIn,
      afterSubmitExe,
      address,
      wallet,
      signRequest,
      tx: txToSign,
      setAwaiting,
      t
    })
  } catch (e) {
    setAwaiting(false)
    setStatus(normalizeErr(e))
  }
}

export const xyraTxSend = async ({
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
    const xyraNetwork = getXyraNetwork()
    if (!xyraNetwork) {
      setStatus('Xyra supports only Mainnet/Testnet for XRPL & Xahau (this network is not supported).')
      setAwaiting(false)
      return
    }

    // If already logged in with Xyra, don't reconnect (avoids extra popup)
    if (account?.address && account?.wallet === 'xyra') {
      await xyraSign({
        address: account.address,
        publicKey: account.publicKey, // if you store it; ok if undefined
        tx,
        signRequest,
        afterSubmitExe,
        afterSigning,
        onSignIn,
        setStatus,
        setAwaiting,
        t
      })
      return
    }

    // Connect must be called from user click (popup)
    setAwaiting(true)
    setStatus('Please approve the connection in Xyra app, and follow instructions there.')

    const { address, network, publicKey } = await sdk.connect({
      network: xyraNetwork,
      onProgress: () => {}
    })

    if (network && network !== xyraNetwork) {
      setAwaiting(false)
      setStatus(`Please switch Xyra network to ${xyraNetwork} (currently ${network}).`)
      return
    }

    setAwaiting(false)

    await xyraSign({
      address,
      publicKey,
      tx,
      signRequest,
      afterSubmitExe,
      afterSigning,
      onSignIn,
      setStatus,
      setAwaiting,
      t
    })
  } catch (e) {
    setAwaiting(false)
    setStatus(normalizeErr(e))
  }
}
