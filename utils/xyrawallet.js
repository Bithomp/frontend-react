// utils/xyrawallet.js
import sdk from '@xyrawallet/sdk'
import { broadcastTransaction, getNextTransactionParams } from './user'
import { networkId, xahauNetwork } from '.'

// By default we sign in Xyra and submit via our server (same pattern as Ledger/Gem/Crossmark in this codebase)
const useOurServer = true

export const getXyraNetwork = () => {
  // XRPL
  if (!xahauNetwork) {
    if (networkId === 0) return 'xrpl-mainnet'
    if (networkId === 1) return 'xrpl-testnet'
    // XRPL devnet not listed in Xyra docs
    return null
  }

  // XAHAU
  if (networkId === 21337) return 'xahau-mainnet'
  if (networkId === 21338) return 'xahau-testnet'
  // other xahau networks not listed
  return null
}

export const normalizeXyraErr = (e) => {
  const msg = String(e?.message || e || '')
  const lo = msg.toLowerCase()
  if (lo.includes('popup')) return 'Popup was blocked. Please allow popups and try again.'
  if (lo.includes('reject') || lo.includes('denied')) return 'Request rejected in Xyra.'
  return msg || 'Xyra error'
}

/**
 * Xyra popups MUST be opened from a user gesture (onClick).
 * We split flow into:
 * 1) connect (popup)
 * 2) (optional) prepare tx fee/sequence (no popup)
 * 3) sign or signAndSubmit (popup) -> must be another user gesture
 */
export const xyraConnect = async ({ setStatus, setAwaiting }) => {
  const xyraNetwork = getXyraNetwork()
  if (!xyraNetwork) {
    throw new Error('Xyra supports only Mainnet/Testnet for XRPL & Xahau (this network is not supported).')
  }

  setAwaiting(true)
  setStatus('Please approve the connection in Xyra.')

  const { address, network, publicKey } = await sdk.connect({
    network: xyraNetwork,
    onProgress: () => {}
  })

  if (network && network !== xyraNetwork) {
    throw new Error(`Please switch Xyra network to ${xyraNetwork} (currently ${network}).`)
  }

  setAwaiting(false)
  return { address, publicKey, xyraNetwork }
}

export const xyraPrepareTx = async ({ tx, address, publicKey, setStatus, setAwaiting }) => {
  if (!tx) return { tx }

  if (!tx.Account) tx.Account = address
  if (publicKey && !tx.SigningPubKey) tx.SigningPubKey = String(publicKey).toUpperCase()

  // Login-only / SignIn doesn't need fee/seq
  if (tx.TransactionType === 'SignIn') return { tx }

  setAwaiting(true)
  setStatus('Getting transaction fee...')
  const params = await getNextTransactionParams(tx)
  setAwaiting(false)

  if (!params) throw new Error('Error getting transaction fee.')

  tx.Sequence = params.Sequence
  tx.Fee = params.Fee
  tx.LastLedgerSequence = params.LastLedgerSequence

  return { tx }
}

export const xyraSignOnly = async ({ tx, xyraNetwork }) => {
  const { tx_blob } = await sdk.sign({ transaction: tx, network: xyraNetwork })
  return tx_blob
}

export const xyraSignAndSubmit = async ({ tx, xyraNetwork }) => {
  // Docs: signAndSubmit requires explicit opt-in, and returns tx_blob + hash + submitted + submitResult
  const res = await sdk.signAndSubmit({ transaction: tx, network: xyraNetwork })
  return res
}

/**
 * Must be called from user gesture.
 * If useOurServer=true:
 *  - sdk.sign (popup) -> broadcastTransaction (our server submit)
 * If useOurServer=false:
 *  - sdk.signAndSubmit (popup) -> afterSubmitExe with returned hash/result
 */
export const xyraSignAndMaybeSubmit = async ({
  tx,
  xyraNetwork,
  signRequest,
  afterSubmitExe,
  afterSigning,
  onSignIn,
  setStatus,
  setAwaiting,
  t
}) => {
  const wallet = 'xyra'
  const signRequestData = signRequest?.data

  // Sign-only request (no submit)
  if (signRequestData?.signOnly) {
    setStatus('Sign the transaction in Xyra.')
    const blob = await xyraSignOnly({ tx, xyraNetwork })
    afterSigning({ signRequestData, blob, address: tx.Account })
    return
  }

  // Login-only flow
  if (!tx || tx?.TransactionType === 'SignIn') {
    onSignIn({ address: tx?.Account, wallet, redirectName: signRequest?.redirect })
    afterSubmitExe({})
    return
  }

  if (useOurServer) {
    setStatus('Sign the transaction in Xyra.')
    const blob = await xyraSignOnly({ tx, xyraNetwork })

    setStatus('Submitting transaction to the network...')
    setAwaiting(true)
    broadcastTransaction({
      blob,
      setStatus,
      onSignIn,
      afterSubmitExe,
      address: tx.Account,
      wallet,
      signRequest,
      tx,
      setAwaiting,
      t
    })
    return
  }

  // Let Xyra submit (still popup)
  setAwaiting(true)
  setStatus('Sign and submit in Xyra.')
  const { hash, submitted, submitResult } = await xyraSignAndSubmit({ tx, xyraNetwork })
  setAwaiting(false)

  // If submitted=false, still treat as signed but not submitted
  onSignIn({ address: tx.Account, wallet, redirectName: signRequest?.redirect })
  afterSubmitExe({
    redirectName: signRequest?.redirect,
    broker: signRequest?.broker?.name,
    txHash: hash,
    txType: tx.TransactionType,
    result: submitResult?.engine_result
  })

  // "submitted" is available if you want to show it in UI
  return { submitted, submitResult }
}
