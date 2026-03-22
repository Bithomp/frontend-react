import { broadcastTransaction, getNextTransactionParams } from './user'
import { encode } from 'xrpl-binary-codec-prerelease'
import { xahauNetwork } from '.'
import { xahauDefinitions } from './xahau'
import axios from 'axios'

// D'Cent Biometric Hardware Wallet via dcent-web-connector SDK
// https://dev-docs.dcentwallet.com/dcent-biometric-wallet-for-pc/dcent-web-connector/xrpl-xrp-ledger

const ensureChromeRuntimeCompatibility = () => {
  if (typeof window === 'undefined') return

  const runtime = window?.chrome?.runtime
  if (!runtime) return

  // Some browser environments expose chrome.runtime without getManifest.
  // dcent-web-connector expects getManifest to exist during module init.
  if (typeof runtime.getManifest !== 'function') {
    try {
      runtime.getManifest = () => ({ manifest_version: 2 })
    } catch (_) {
      // ignore if runtime object is not writable
    }
  }
}

const getDcent = async () => {
  ensureChromeRuntimeCompatibility()
  const mod = await import('dcent-web-connector')
  return mod.default || mod
}

const getDcentDerivationPath = (accountIndex = 0) => `m/44'/144'/${accountIndex}'/0/0`

const encodeTx = (tx) => (xahauNetwork ? encode(tx, xahauDefinitions) : encode(tx))

export const dcentErrorMessage = (e) => {
  const code = e?.body?.error?.code || e?.code || ''
  const msg = e?.body?.error?.message || e?.message || String(e)

  if (msg?.includes?.('chrome.runtime.getManifest is not a function')) {
    return "Browser extension runtime conflict detected. Please refresh the page and try D'Cent again."
  }

  if (code === 'no_device') return "D'Cent Biometric Wallet is not connected. Please connect via USB and try again."
  if (code === 'user_cancel') return "Transaction signing cancelled on D'Cent device."
  if (code === 'pop-up_closed') return "D'Cent Bridge popup was closed. Please try again."
  if (code === 'time_out') return "D'Cent request timed out. Please try again."
  if (code === 'param_error') return "Invalid transaction parameters for D'Cent: " + msg
  return msg || "D'Cent wallet error"
}

export const dcentGetAddresses = async ({ startIndex = 0, count = 5 } = {}) => {
  const DcentWebConnector = await getDcent()
  const addresses = []
  try {
    for (let i = startIndex; i < startIndex + count; i++) {
      const keyPath = getDcentDerivationPath(i)
      const result = await DcentWebConnector.getAddress(DcentWebConnector.coinType.RIPPLE, keyPath)
      const address = result?.body?.parameter?.address
      if (address) {
        addresses.push({ accountIndex: i, path: keyPath, address })
      }
    }
  } finally {
    DcentWebConnector.popupWindowClose()
  }
  return addresses
}

export const dcentGetAddressesWithBalances = async ({ startIndex = 0, count = 5 } = {}) => {
  const discovered = await dcentGetAddresses({ startIndex, count })

  const rows = discovered.map((item) => ({
    ...item,
    username: null,
    balanceDrops: null,
    isFunded: false
  }))

  const enrichPromise = Promise.all(
    discovered.map(async (item) => {
      try {
        const [balanceResponse, usernameResponse] = await Promise.allSettled([
          axios('/xrpl/accounts/' + item.address),
          axios('/v2/address/' + item.address + '?username=true')
        ])

        const fastBalance =
          balanceResponse.status === 'fulfilled' ? Number(balanceResponse.value?.data?.account_data?.balance) : 0
        const username = usernameResponse.status === 'fulfilled' ? usernameResponse.value?.data?.username || null : null

        return {
          ...item,
          username,
          balanceDrops: Number.isFinite(fastBalance) ? fastBalance : 0,
          isFunded: Number.isFinite(fastBalance) ? fastBalance > 0 : false
        }
      } catch (_) {
        return {
          ...item,
          username: null,
          balanceDrops: 0,
          isFunded: false
        }
      }
    })
  )

  return { rows, enrichPromise }
}

export const dcentBuildConnectSelection = ({ accounts, selectedAddresses }) => {
  const visibleAddresses = (accounts || []).map((item) => item.address)
  const selectedVisible = (selectedAddresses || []).filter((addressItem) => visibleAddresses.includes(addressItem))

  if (!selectedVisible.length) {
    return null
  }

  const walletMetaMap = {}
  const usernameMap = {}

  selectedVisible.forEach((addressItem) => {
    const entry = (accounts || []).find((item) => item.address === addressItem)
    if (entry) {
      walletMetaMap[entry.address] = {
        derivationPath: entry.path,
        accountIndex: entry.accountIndex
      }
      if (entry.username) {
        usernameMap[entry.address] = entry.username
      }
    }
  })

  return {
    addresses: selectedVisible,
    walletMetaMap,
    usernameMap
  }
}

export const dcentTxSend = async ({
  tx,
  address: selectedAddress,
  path: selectedPath,
  signRequest,
  afterSubmitExe,
  afterSigning,
  onSignIn,
  setStatus,
  setAwaiting,
  t
}) => {
  const wallet = 'dcent'
  let DcentWebConnector

  try {
    DcentWebConnector = await getDcent()
    const keyPath = selectedPath || getDcentDerivationPath(0)
    const address = selectedAddress || null

    if (!tx || tx.TransactionType === 'SignIn') {
      onSignIn({ address, wallet, redirectName: signRequest?.redirect })
      afterSubmitExe({})
      return
    }

    const signRequestData = signRequest?.data

    if (signRequestData?.signOnly) {
      setStatus("Please confirm the transaction on your D'Cent device.")
      setAwaiting(true)

      const txToSign = { ...tx }
      if (!txToSign.Account) txToSign.Account = address
      txToSign.Fee = String(txToSign.Fee || '12')
      txToSign.Sequence = Number(txToSign.Sequence || 0)

      const result = await DcentWebConnector.getXrpSignedTransaction(txToSign, keyPath)
      DcentWebConnector.popupWindowClose()
      setAwaiting(false)

      const { sign, pubkey } = result?.body?.parameter || {}
      if (!sign || !pubkey) {
        setStatus("Failed to get signature from D'Cent device.")
        return
      }
      txToSign.TxnSignature = sign.toUpperCase()
      txToSign.SigningPubKey = pubkey.toUpperCase()
      const blob = encodeTx(txToSign)
      afterSigning({ signRequestData, blob, address: txToSign.Account })
      return
    }

    setStatus('Getting transaction fee...')
    setAwaiting(true)
    const params = await getNextTransactionParams(tx)
    setAwaiting(false)

    if (!params) {
      setStatus('Error getting transaction fee.')
      return
    }

    tx.Sequence = Number(params.Sequence)
    tx.Fee = String(params.Fee)
    tx.LastLedgerSequence = params.LastLedgerSequence
    if (!tx.Account) tx.Account = address

    setStatus("Please confirm the transaction on your D'Cent device.")
    setAwaiting(true)

    const result = await DcentWebConnector.getXrpSignedTransaction(tx, keyPath)
    DcentWebConnector.popupWindowClose()
    setAwaiting(false)

    const { sign, pubkey } = result?.body?.parameter || {}
    if (!sign || !pubkey) {
      setStatus("Failed to get signature from D'Cent device.")
      return
    }

    tx.TxnSignature = sign.toUpperCase()
    tx.SigningPubKey = pubkey.toUpperCase()
    const blob = encodeTx(tx)

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
  } catch (e) {
    try {
      if (DcentWebConnector) DcentWebConnector.popupWindowClose()
    } catch (_) {}
    setAwaiting(false)
    setStatus(dcentErrorMessage(e))
  }
}
