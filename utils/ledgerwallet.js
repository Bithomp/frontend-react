import TransportWebHID from '@ledgerhq/hw-transport-webhid'
import Xrp from '@ledgerhq/hw-app-xrp'
import { broadcastTransaction, getNextTransactionParams } from './user'
import { encode } from 'xrpl-binary-codec-prerelease'
import { nativeCurrency, xahauNetwork } from '.'
import { xahauDefinitions } from './xahau'
import axios from 'axios'

const errorHandle = (error) => {
  const msg = String(error?.message || error)
  const statusCode = error?.statusCode

  if (msg.includes('DEVICE_NOT_ONBOARDED') || statusCode === 0x6d07) {
    throw new Error(
      'Ledger app is not installed on your device. Install the ' +
        nativeCurrency +
        ' app via Ledger Live Manager, open it on your Ledger, and try again.'
    )
  }

  // App-level status from Ledger (e.g. 0x650f when app is not open)
  if (error?.name === 'TransportStatusError' && typeof statusCode === 'number') {
    console.error('Ledger TransportStatusError:', statusCode, error.statusText)

    if (statusCode === 0x650f) {
      throw new Error(
        'Ledger connection is not ready. Even if your device is unlocked and the ' +
          nativeCurrency +
          ' app is open, the browser session can be stale. Reopen the ' +
          nativeCurrency +
          ' app on Ledger, close Ledger Live if open, then try again.'
      )
    }

    // CLA_NOT_SUPPORTED
    if (statusCode === 0x6e00) {
      throw new Error(
        'Ledger did not accept this command. Please unlock your Ledger, open the ' +
          nativeCurrency +
          ' app, and try again. If it still fails, reconnect the device and retry.'
      )
    }

    // Security status not satisfied (PIN not entered / device locked)
    if (statusCode === 0x6901) {
      throw new Error('Ledger device is locked. Please unlock it by entering your PIN, then try again.')
    }

    if (statusCode === 0x6985) {
      throw new Error('Signing cancelled on your Ledger device.')
    }

    // INCORRECT_DATA
    if (statusCode === 0x6a80) {
      throw new Error(
        'Ledger rejected this transaction data. Please confirm you selected the correct Ledger account, make sure the transaction Account matches that address, then try again.'
      )
    }

    if (statusCode === 0x6d07) {
      throw new Error(
        'Ledger app is not installed on your device. Install the ' +
          nativeCurrency +
          ' app via Ledger Live Manager, open it on your Ledger, and try again.'
      )
    }

    throw new Error(`Ledger error: ${error.statusText || 'Unknown status'} (0x${statusCode.toString(16)})`)
  }

  // Device already in use (other tab/app)
  if (msg.includes('already open') || error?.name === 'InvalidStateError') {
    console.warn('Ledger WebHID: device is already open somewhere else.')
    throw new Error(
      'Ledger device is already in use. If the page was refreshed, unplug/replug Ledger or close and reopen the browser tab, then try again.'
    )
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
const LEDGER_APP_GLOBAL_KEY = '__bithomp_ledger_xrp_app__'

const getGlobalLedgerApp = () => {
  if (typeof globalThis === 'undefined') return null
  return globalThis[LEDGER_APP_GLOBAL_KEY] || null
}

const setGlobalLedgerApp = (app) => {
  if (typeof globalThis === 'undefined') return
  globalThis[LEDGER_APP_GLOBAL_KEY] = app || null
}

const closeOpenedHidDevices = async () => {
  if (typeof navigator === 'undefined' || !navigator?.hid?.getDevices) return
  const devices = await navigator.hid.getDevices()
  if (!devices?.length) return

  for (const device of devices) {
    if (!device?.opened || typeof device.close !== 'function') continue
    try {
      await device.close()
    } catch (_) {
      // ignore close errors; we'll retry opening transport after best-effort cleanup
    }
  }
}

export const ledgerwalletForceReset = async () => {
  try {
    await ledgerwalletDisconnect()
  } catch (_) {
    // ignore
  }

  try {
    await closeOpenedHidDevices()
  } catch (_) {
    // ignore
  }

  xrpAppInstance = null
  xrpAppPromise = null
  setGlobalLedgerApp(null)
}

const connectLedgerHID = async () => {
  const globalApp = getGlobalLedgerApp()
  if (globalApp?.transport) {
    xrpAppInstance = globalApp
    return globalApp
  }

  // if already connected - reuse it
  if (xrpAppInstance) return xrpAppInstance
  if (xrpAppPromise) return xrpAppPromise

  const attachTransport = (transport) => {
    const app = new Xrp(transport)
    xrpAppInstance = app
    setGlobalLedgerApp(app)

    // if transport supports 'on' method - listen for disconnect event
    if (typeof transport.on === 'function') {
      transport.on('disconnect', () => {
        xrpAppPromise = null
        xrpAppInstance = null
        setGlobalLedgerApp(null)
      })
    }

    return app
  }

  xrpAppPromise = TransportWebHID.create()
    .then((transport) => {
      return attachTransport(transport)
    })
    .catch(async (error) => {
      const msg = String(error?.message || error)
      const isLockError = msg.includes('already open') || error?.name === 'InvalidStateError'
      const canAttachOpenConnected = isLockError && typeof TransportWebHID.openConnected === 'function'

      if (canAttachOpenConnected) {
        try {
          const openTransport = await TransportWebHID.openConnected()
          if (openTransport) {
            return attachTransport(openTransport)
          }
        } catch (secondaryError) {
          xrpAppPromise = null
          xrpAppInstance = null
          errorHandle(secondaryError)
          return
        }
      }

      if (isLockError) {
        try {
          await closeOpenedHidDevices()
          const retriedTransport = await TransportWebHID.create()
          if (retriedTransport) {
            return attachTransport(retriedTransport)
          }
        } catch (_) {
          // continue to next fallback
        }
      }

      const canReadHidDevices = typeof navigator !== 'undefined' && navigator?.hid?.getDevices
      if (canReadHidDevices && typeof TransportWebHID.open === 'function') {
        try {
          const devices = await navigator.hid.getDevices()
          if (devices?.length) {
            const opened = await TransportWebHID.open(devices[0])
            if (opened) {
              return attachTransport(opened)
            }
          }
        } catch (tertiaryError) {
          xrpAppPromise = null
          xrpAppInstance = null
          errorHandle(tertiaryError)
          return
        }
      }

      xrpAppPromise = null
      xrpAppInstance = null
      errorHandle(error)
    })

  return xrpAppPromise
}

const getLedgerAddress = async (xrpApp, path = "44'/144'/0'/0/0") => {
  try {
    const result = await xrpApp.getAddress(path)
    return { ...result, path }
  } catch (error) {
    errorHandle(error)
  }
}

const getLedgerDerivationPath = (accountIndex = 0) => `44'/144'/${accountIndex}'/0/0`

export const ledgerwalletGetAddresses = async ({ start = 0, count = 20 } = {}) => {
  const xrpApp = await connectLedgerHID()
  const safeStart = Number.isFinite(start) ? Math.max(0, Number(start)) : 0
  const safeCount = Number.isFinite(count) ? Math.min(50, Math.max(1, Number(count))) : 20

  const entries = []
  for (let i = 0; i < safeCount; i++) {
    const accountIndex = safeStart + i
    const path = getLedgerDerivationPath(accountIndex)
    const result = await getLedgerAddress(xrpApp, path)
    if (!result?.address) continue
    entries.push({
      accountIndex,
      path,
      address: result.address,
      publicKey: result.publicKey?.toUpperCase?.() || result.publicKey || null
    })
  }

  return entries
}

const isLedgerLockErrorMessage = ({ message, nativeCurrencyValue }) => {
  const msg = String(message || '')
  const lower = msg.toLowerCase()
  return (
    msg.includes('already in use') ||
    msg.includes('already open') ||
    msg.includes('InvalidState') ||
    lower.includes('locked') ||
    lower.includes('open the xrp app') ||
    lower.includes('open the ' + String(nativeCurrencyValue || 'xrp').toLowerCase() + ' app')
  )
}

export const ledgerwalletNeedsReconnectFromStatus = ({ statusText, nativeCurrencyValue }) => {
  const lower = String(statusText || '').toLowerCase()
  return (
    lower.includes('locked') ||
    lower.includes('open the xrp app') ||
    lower.includes('open the ' + String(nativeCurrencyValue || 'xrp').toLowerCase() + ' app')
  )
}

export const ledgerwalletGetAddressesWithBalances = async ({ start = 0, count = 10, nativeCurrencyValue }) => {
  let discovered

  try {
    discovered = await ledgerwalletGetAddresses({ start, count })
  } catch (err) {
    const lockError = isLedgerLockErrorMessage({
      message: err?.message || err,
      nativeCurrencyValue
    })
    if (!lockError) throw err

    await ledgerwalletForceReset()
    await new Promise((resolve) => setTimeout(resolve, 250))
    discovered = await ledgerwalletGetAddresses({ start, count })
  }

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

        const balanceNative =
          balanceResponse.status === 'fulfilled' ? Number(balanceResponse.value?.data?.account_data?.balance) : 0
        const username = usernameResponse.status === 'fulfilled' ? usernameResponse.value?.data?.username || null : null

        return {
          ...item,
          username,
          balanceDrops: Number.isFinite(balanceNative) ? balanceNative : 0,
          isFunded: Number.isFinite(balanceNative) ? balanceNative > 0 : false
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

export const ledgerwalletBuildConnectSelection = ({ ledgerAccounts, ledgerSelectedAddresses }) => {
  const visibleAddresses = (ledgerAccounts || []).map((item) => item.address)
  const selectedVisible = (ledgerSelectedAddresses || []).filter((addressItem) =>
    visibleAddresses.includes(addressItem)
  )

  if (!selectedVisible.length) {
    return null
  }

  const ordered = (ledgerSelectedAddresses || [])
    .filter((addressItem) => selectedVisible.includes(addressItem))
    .map((addressItem) => (ledgerAccounts || []).find((item) => item.address === addressItem))
    .filter(Boolean)

  const walletMetaMap = {}
  const usernameMap = {}

  for (const entry of ordered) {
    walletMetaMap[entry.address] = {
      derivationPath: entry.path,
      publicKey: entry.publicKey || null,
      accountIndex: entry.accountIndex
    }
    usernameMap[entry.address] = entry.username || null
  }

  return {
    addresses: ordered.map((item) => item.address),
    walletMetaMap,
    usernameMap
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
    errorHandle(error)
  }
}

const ledgerwalletSign = async ({
  xrpApp,
  address,
  path,
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
  const signRequestData = signRequest.data
  const parsedAccountIndex = parseInt(/44'\/144'\/(\d+)'/.exec(path || '')?.[1], 10)
  const walletMetaMap = {
    [address]: {
      derivationPath: path || null,
      publicKey: publicKey || null,
      accountIndex: Number.isFinite(parsedAccountIndex) ? parsedAccountIndex : null
    }
  }

  if (signRequestData?.signOnly) {
    setStatus('Sign the transaction in Ledger Wallet.')
    setAwaiting(true)
    try {
      const signature = await signTransactionWithLedger(xrpApp, tx, path)
      tx.TxnSignature = signature
      const blob = encodeTx(tx)
      afterSigning({ signRequestData, blob, address })
    } catch (err) {
      setAwaiting(false)
      setStatus(err.message)
    }
  } else {
    const wallet = 'ledgerwallet'
    setAwaiting(true)

    if (!tx || tx?.TransactionType === 'SignIn') {
      onSignIn({ address, wallet, walletMetaMap, redirectName: signRequest.redirect })
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
    setAwaiting(true)
    try {
      const signature = await signTransactionWithLedger(xrpApp, tx, path)
      tx.TxnSignature = signature

      // use same encoding as for signing
      const blob = encodeTx(tx)

      setStatus('Submitting transaction to the network...')
      broadcastTransaction({
        blob,
        setStatus,
        onSignIn,
        afterSubmitExe,
        address,
        wallet,
        walletMetaMap,
        signRequest,
        tx,
        setAwaiting,
        t
      })
    } catch (err) {
      setAwaiting(false)
      setStatus(err.message)
    }
  }
}

const LEDGER_ADDRESS_SCAN_LIMIT = 10

const findLedgerPathForAddress = async (xrpApp, targetAddress) => {
  const lowerTarget = String(targetAddress || '').toLowerCase()
  if (!lowerTarget) return null

  for (let i = 0; i < LEDGER_ADDRESS_SCAN_LIMIT; i++) {
    const candidatePath = getLedgerDerivationPath(i)
    const candidate = await getLedgerAddress(xrpApp, candidatePath)
    if (candidate?.address && candidate.address.toLowerCase() === lowerTarget) {
      return candidate
    }
  }

  return null
}

export const ledgerwalletTxSend = async ({
  tx,
  address: selectedAddress,
  publicKey: selectedPublicKey,
  path: selectedPath,
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
    let path = selectedPath || null
    let address = selectedAddress || null
    let publicKey = selectedPublicKey || null

    // Recover legacy records where derivation path is missing in localStorage.
    if (!path && address) {
      setStatus('Locating your Ledger account...')
      const matched = await findLedgerPathForAddress(xrpApp, address)
      if (matched?.path) {
        path = matched.path
        publicKey = publicKey || matched.publicKey || null
      }
    }

    if (!path) {
      path = getLedgerDerivationPath(0)
    }

    if (!address || !publicKey) {
      const resolved = await getLedgerAddress(xrpApp, path)
      address = address || resolved?.address
      publicKey = publicKey || resolved?.publicKey
      path = resolved?.path || path
    }

    if (!tx.Account) {
      tx.Account = address
    }
    tx.SigningPubKey = publicKey?.toUpperCase()
    ledgerwalletSign({
      xrpApp,
      address,
      path,
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
    setGlobalLedgerApp(null)
  }
}
