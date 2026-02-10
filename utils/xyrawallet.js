// utils/xyrawallet.js
import sdk from '@xyrawallet/sdk'
import { broadcastTransaction, getNextTransactionParams } from './user'
import { networkId, xahauNetwork } from '.'

const getXyraNetwork = () => {
  // Supported by SDK validation: xrpl-mainnet, xrpl-testnet, xahau-mainnet, xahau-testnet  [oai_citation:1‡index.js](sediment://file_00000000c9487243885674c0684a6810)
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

  if (low.includes('popup was blocked')) return 'Popup was blocked. Please allow popups and try again.'
  if (low.includes('popup')) return 'Popup was blocked. Please allow popups and try again.'
  if (low.includes('closed the popup')) return 'Popup was closed before completing the action.'
  if (low.includes('timeout')) return 'Request timed out. Please try again.'
  if (low.includes('reject')) return 'Request rejected in Xyra.'
  return msg || 'Xyra error'
}

/**
 * IMPORTANT:
 * - This function MUST be called directly from a user gesture (button click),
 *   otherwise the popup can be blocked.  [oai_citation:2‡index.js](sediment://file_00000000c9487243885674c0684a6810)
 * - Tx MUST already contain Fee/Sequence/LastLedgerSequence when submit=true (your flow).
 */
export const xyraTxSend = async ({
  tx,
  signRequest,
  afterSubmitExe,
  afterSigning,
  onSignIn,
  setStatus,
  setAwaiting,
  t
}) => {
  const xyraNetwork = getXyraNetwork()
  const wallet = 'xyra'
  const signRequestData = signRequest?.data

  if (!xyraNetwork) {
    setAwaiting(false)
    setStatus('Xyra supports only XRPL/Xahau Mainnet & Testnet (this network is not supported).')
    return
  }

  try {
    // LOGIN-ONLY:
    // Use signMessage (network-agnostic) to get address without doing connect() -> avoids extra popup later.
    if (!tx || tx?.TransactionType === 'SignIn') {
      setAwaiting(true)
      setStatus('Open Xyra to sign a login message...')

      const message =
        `Sign in to Bithomp\n` +
        `Origin: ${typeof window !== 'undefined' ? window.location.origin : ''}\n` +
        `Time: ${new Date().toISOString()}`

      const res = await sdk.signMessage({
        message,
        onProgress: () => {}
      })

      setAwaiting(false)

      const address = res?.address
      if (!address) {
        setStatus('Xyra did not return an address.')
        return
      }

      // treat as logged in
      await onSignIn?.({ address, wallet, redirectName: signRequest?.redirect })
      afterSubmitExe?.({})
      return
    }

    // SIGN ONLY (user wants submit through your server)
    if (signRequestData?.signOnly) {
      setAwaiting(true)
      setStatus('Sign the transaction in Xyra...')

      const { tx_blob } = await sdk.sign({
        transaction: tx,
        network: xyraNetwork
      })

      setAwaiting(false)

      if (!tx_blob) {
        setStatus('Xyra did not return tx_blob.')
        return
      }

      afterSigning?.({ signRequestData, blob: tx_blob, address: tx.Account })
      return
    }

    // NORMAL TX: sign -> submit via our server
    setAwaiting(true)
    setStatus('Sign the transaction in Xyra...')

    const { tx_blob } = await sdk.sign({
      transaction: tx,
      network: xyraNetwork
    })

    if (!tx_blob) {
      setAwaiting(false)
      setStatus('Xyra did not return tx_blob.')
      return
    }

    setStatus('Submitting transaction to the network...')
    broadcastTransaction({
      blob: tx_blob,
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
  } catch (e) {
    setAwaiting(false)
    setStatus(normalizeErr(e))
  }
}

/**
 * Helper: prepare Fee/Sequence/LastLedgerSequence BEFORE opening Xyra popup.
 * Call this BEFORE user clicks "Open Xyra" (so later call is popup-safe).
 */
export const xyraPrepareTx = async ({ tx, setStatus, setAwaiting }) => {
  setAwaiting(true)
  setStatus('Getting transaction fee...')

  const params = await getNextTransactionParams(tx)

  setAwaiting(false)

  if (!params) {
    setStatus('Error getting transaction fee.')
    return null
  }

  return {
    ...tx,
    Sequence: params.Sequence,
    Fee: params.Fee,
    LastLedgerSequence: params.LastLedgerSequence
  }
}

export const xyraIsSupportedNetwork = () => !!getXyraNetwork()
